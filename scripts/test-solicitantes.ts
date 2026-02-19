import { strict as assert } from "assert";

const BASE_URL = "http://localhost:3000";

async function requestJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  return { res, json };
}

function generateCpfDigits() {
  const randDigit = () => Math.floor(Math.random() * 10);
  const base = Array.from({ length: 9 }, randDigit).join("");

  const calc = (seed: string, factor: number) => {
    let total = 0;
    for (let i = 0; i < seed.length; i++) {
      total += Number(seed[i]) * (factor - i);
    }
    const mod = (total * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(base, 10);
  const d2 = calc(base + String(d1), 11);
  return base + String(d1) + String(d2);
}

async function main() {
  const resLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@ticketbr.com", password: "admin123" }),
  });
  assert.equal(resLogin.status, 200);
  const cookie = resLogin.headers.get("set-cookie");
  assert.ok(cookie);

  const { res: resList, json: listJson } = await requestJson(`${BASE_URL}/api/solicitantes?page=1&pageSize=10`);
  assert.equal(resList.status, 401);

  const { res: resListAuth, json: listJsonAuth } = await requestJson(`${BASE_URL}/api/solicitantes?page=1&pageSize=10`, {
    headers: { Cookie: cookie! },
  });
  assert.equal(resListAuth.status, 200);
  assert.ok(typeof listJsonAuth.total === "number");

  const cpfDigits = generateCpfDigits();
  const payload = {
    nome: "Fulano da Silva",
    cpfCnpj: cpfDigits,
    email: `fulano.${Date.now()}@example.com`,
    telefone: "(11) 98888-7777",
    enderecoCompleto: "Rua A, 100 - SP",
  };

  const { res: resCreate, json: createJson } = await requestJson(`${BASE_URL}/api/solicitantes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(resCreate.status, 401);

  const { res: resCreateAuth, json: createJsonAuth } = await requestJson(`${BASE_URL}/api/solicitantes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie! },
    body: JSON.stringify(payload),
  });
  assert.equal(resCreateAuth.status, 201);
  assert.ok(createJsonAuth.data?.id);
  const createdId = createJsonAuth.data.id as string;
  const { res: resSearch, json: searchJson } = await requestJson(`${BASE_URL}/api/solicitantes?search=Fulano&page=1&pageSize=10`, {
    headers: { Cookie: cookie! },
  });
  assert.equal(resSearch.status, 200);
  assert.ok(searchJson.total >= 1);

  const { res: resDelete, json: delJson } = await requestJson(`${BASE_URL}/api/solicitantes/${createdId}`, {
    method: "DELETE",
    headers: { Cookie: cookie! },
  });
  assert.equal(resDelete.status, 200);
  assert.equal(delJson.success, true);

  console.log("OK solicitantes CRUD smoke test");
}


main().catch((e) => {
  console.error(e);
  process.exit(1);
});
