import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4102);

loadEnvFile(join(rootDir, ".env.local"));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  // Small dotenv reader so the prototype does not need a dependency just to
  // keep provider credentials on the server.
  const source = requireText(path);
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function requireText(path) {
  return readFileSync(path, "utf8");
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function contentType(path) {
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  }[extname(path).toLowerCase()] || "application/octet-stream";
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large");
  }
  return JSON.parse(body || "{}");
}

function providerKey(provider) {
  return provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
}

async function callProvider({ provider, model, messages, system, maxTokens }) {
  const key = providerKey(provider);
  if (!key) throw Object.assign(new Error(`${provider} API key is not configured on the server`), { status: 503 });

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: model || "claude-3-5-haiku-latest", max_tokens: maxTokens || 800, system, messages }),
    });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(payload.error?.message || "Anthropic request failed"), { status: response.status });
    return { provider, model: payload.model, text: payload.content?.filter((item) => item.type === "text").map((item) => item.text).join("\n") || "" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: model || "gpt-4o-mini", max_tokens: maxTokens || 800, messages: system ? [{ role: "system", content: system }, ...messages] : messages }),
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || "OpenAI request failed"), { status: response.status });
  return { provider, model: payload.model, text: payload.choices?.[0]?.message?.content || "" };
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true, providers: { openai: Boolean(process.env.OPENAI_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) } });
  }

  if (url.pathname !== "/api/ai" || req.method !== "POST") return json(res, 404, { error: "API route not found" });

  try {
    const body = await readBody(req);
    const provider = body.provider === "anthropic" ? "anthropic" : body.provider === "openai" ? "openai" : null;
    if (!provider || !Array.isArray(body.messages) || !body.messages.length) return json(res, 400, { error: "Provide a provider and at least one message" });
    if (body.messages.some((message) => !message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
      return json(res, 400, { error: "Messages must contain user or assistant roles and text content" });
    }
    return json(res, 200, await callProvider({ provider, model: body.model, messages: body.messages, system: body.system || "", maxTokens: body.maxTokens }));
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "AI request failed" });
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(rootDir, requested));
  if (!filePath.startsWith(rootDir + sep)) return json(res, 403, { error: "Forbidden" });
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(content);
  } catch {
    json(res, 404, { error: "File not found" });
  }
});

server.listen(port, () => console.log(`Raise Local server running at http://localhost:${port}`));
