import JSZip from "jszip";

type SheetRow = Record<string, unknown>;

export type XlsxSheet = {
  name: string;
  rows: SheetRow[];
};

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function safeSheetName(name: string, fallback: string) {
  const cleaned = name.replace(/[\[\]*?:/\\]/g, " ").trim() || fallback;
  return cleaned.slice(0, 31);
}

function sheetColumns(rows: SheetRow[]) {
  const keys = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return Array.from(keys);
}

function cellXml(value: unknown, rowIndex: number, columnIndex: number) {
  const ref = `${columnName(columnIndex)}${rowIndex}`;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(rows: SheetRow[]) {
  const columns = sheetColumns(rows);
  const headerCells = columns.map((column, index) => cellXml(column, 1, index)).join("");
  const bodyRows = rows
    .map((row, rowIndex) => {
      const excelRowIndex = rowIndex + 2;
      const cells = columns.map((column, columnIndex) => cellXml(row[column], excelRowIndex, columnIndex)).join("");
      return `<row r="${excelRowIndex}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">${headerCells}</row>
    ${bodyRows}
  </sheetData>
</worksheet>`;
}

export async function createXlsxWorkbook(sheets: XlsxSheet[]) {
  const zip = new JSZip();
  const safeSheets = sheets.map((sheet, index) => ({
    ...sheet,
    name: safeSheetName(sheet.name, `Sheet ${index + 1}`)
  }));

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${safeSheets
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("")}
</Types>`);

  zip.folder("_rels")?.file(".rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  zip.folder("xl")?.file("workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${safeSheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}
  </sheets>
</workbook>`);

  zip.folder("xl")?.folder("_rels")?.file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${safeSheets
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
    )
    .join("")}
</Relationships>`);

  const worksheets = zip.folder("xl")?.folder("worksheets");
  safeSheets.forEach((sheet, index) => {
    worksheets?.file(`sheet${index + 1}.xml`, worksheetXml(sheet.rows));
  });

  const buffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return buffer;
}
