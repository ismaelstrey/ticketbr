import nodemailer from "nodemailer";

export type EmailMessage = {
  to: string[];
  subject: string;
  text: string;
};

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

function uniqueEmails(list: string[]) {
  const set = new Set(
    list
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .map((value) => value.toLowerCase())
  );
  return Array.from(set);
}

export async function sendEmail(input: EmailMessage) {
  if (!isEmailConfigured()) return { ok: false as const, skipped: true as const };

  const host = String(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER ? String(process.env.SMTP_USER) : "";
  const pass = process.env.SMTP_PASS ? String(process.env.SMTP_PASS) : "";
  const from = String(process.env.SMTP_FROM);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined
  });

  const to = uniqueEmails(input.to);
  if (!to.length) return { ok: false as const, skipped: true as const };

  await transporter.sendMail({
    from,
    to: to.join(","),
    subject: input.subject,
    text: input.text
  });

  return { ok: true as const };
}

