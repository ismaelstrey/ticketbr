import "dotenv/config";

import { prisma } from "../src/lib/prisma";

type N8nWorkflow = {
  id: string;
  name: string;
  active?: boolean;
  nodes: Array<{
    id?: string;
    name: string;
    type: string;
    typeVersion?: number;
    position?: [number, number];
    parameters: Record<string, any>;
    webhookId?: string;
  }>;
  connections: Record<string, any>;
  settings?: Record<string, any>;
};

const WHATSAPP_CONFIG_DB_KEY = "whatsapp_runtime_config";

function trimUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

async function getN8nConfigFromDb() {
  const rows = await prisma.$queryRawUnsafe<Array<{ value: any }>>(
    `SELECT value FROM app_runtime_settings WHERE key = $1 LIMIT 1`,
    WHATSAPP_CONFIG_DB_KEY
  );
  const value = rows?.[0]?.value;
  const baseUrl = trimUrl(String(value?.n8nBaseUrl ?? process.env.N8N_CHAT_BASE_URL ?? ""));
  const apiKey = String(
    value?.n8nApiKey ??
      process.env.N8N_CHAT_API_KEY ??
      process.env["X-N8N-API-KEY"] ??
      process.env.N8N_API_KEY ??
      ""
  ).trim();
  return { baseUrl, apiKey };
}

async function requestN8n(baseUrl: string, apiKey: string, path: string, init?: RequestInit) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    ...init,
    method: init?.method ?? "GET",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(apiKey ? { "X-N8N-API-KEY": apiKey } : {}),
      ...(init?.headers ?? {})
    }
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  if (!response.ok) {
    throw new Error(`n8n request failed (${response.status}): ${typeof json === "string" ? json : JSON.stringify(json)}`);
  }
  return json;
}

function getNode(workflow: N8nWorkflow, name: string) {
  const node = workflow.nodes.find((n) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  node.parameters ??= {};
  return node;
}

function normalizeWebhookPath(value: string) {
  return value.replace(/^\/+/, "").replace(/\/+$/, "");
}

function ensureJidExpression(expr: string, atSuffix: string) {
  return `={{ ((${expr} || '') + '').includes('@') ? (${expr} || '') : ((${expr} || '') + '${atSuffix}') }}`;
}

async function main() {
  const { baseUrl, apiKey } = await getN8nConfigFromDb();
  if (!baseUrl) throw new Error("n8nBaseUrl não encontrado no banco nem em N8N_CHAT_BASE_URL.");
  if (!apiKey) throw new Error("n8nApiKey não encontrado no banco nem em N8N_CHAT_API_KEY.");

  const workflowId = "LH8wNpuGL3y9uTfx";
  const before = await requestN8n(baseUrl, apiKey, `/api/v1/workflows/${workflowId}`, { method: "GET" });
  const workflow: N8nWorkflow = before?.data ?? before;

  const webhook3 = getNode(workflow, "Webhook3");
  webhook3.parameters.httpMethod = "GET";
  webhook3.parameters.path = normalizeWebhookPath(String(webhook3.parameters.path ?? "conversations")) || "conversations";

  const webhook4 = getNode(workflow, "Webhook4");
  webhook4.parameters.httpMethod = "POST";
  webhook4.parameters.path = normalizeWebhookPath(String(webhook4.parameters.path ?? "messages/send")) || "messages/send";

  const findMessages = getNode(workflow, "Procurar mensagens de um contato");
  findMessages.parameters.remoteJid = ensureJidExpression("$json.query.phone", "@s.whatsapp.net");

  const sendText = getNode(workflow, "Enviar texto2");
  sendText.parameters.remoteJid = ensureJidExpression("$json.body.contactPhone", "@s.whatsapp.net");

  workflow.connections = workflow.connections ?? {};
  workflow.connections.Webhook3 = { main: [[{ node: "Listar contatos", type: "main", index: 0 }]] };

  const updateBody = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: {}
  };

  await requestN8n(baseUrl, apiKey, `/api/v1/workflows/${workflowId}`, {
    method: "PUT",
    body: JSON.stringify(updateBody)
  });

  await requestN8n(baseUrl, apiKey, `/api/v1/workflows/${workflowId}/activate`, { method: "POST" }).catch(() => null);

  console.log(`Workflow atualizado: ${workflowId} (${workflow.name})`);
  console.log(`- Webhook3: GET /webhook/${webhook3.parameters.path}`);
  console.log(`- Webhook4: POST /webhook/${webhook4.parameters.path}`);
  console.log(`- Find-messages remoteJid: ${String(findMessages.parameters.remoteJid)}`);
  console.log(`- Send-text remoteJid: ${String(sendText.parameters.remoteJid)}`);
}

main()
  .catch((e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
