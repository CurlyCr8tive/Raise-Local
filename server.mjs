import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/[\\/]+$/, "");
const port = Number(process.env.PORT || 4102);
const gmailTokenPath = join(rootDir, ".gmail-token.json");
const gmailAuthStates = new Map();
const rateLimitBuckets = new Map();
const MAX_BODY_BYTES = 100_000;

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

function applySecurityHeaders(res, req, isHtml = false) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  if (isHtml) {
    res.setHeader("Content-Security-Policy", [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://images.unsplash.com",
      "connect-src 'self' https://*.supabase.co https://api.openai.com https://api.anthropic.com https://oauth2.googleapis.com https://gmail.googleapis.com",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "));
  }
  if (req.headers["x-forwarded-proto"] === "https") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

function json(res, status, body, req) {
  applySecurityHeaders(res, req);
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

async function readBody(req, maxBytes = MAX_BODY_BYTES) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBytes) throw Object.assign(new Error("Request body is too large"), { status: 413 });
  }
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON"), { status: 400 });
  }
}

function requestOriginIsAllowed(req, allowedOrigins = []) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return parsed.host === (req.headers.host || `localhost:${port}`) || allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

function rateLimit(req, key, limit, windowMs) {
  const now = Date.now();
  const bucketKey = `${clientAddress(req)}:${key}`;
  const bucket = rateLimitBuckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  rateLimitBuckets.set(bucketKey, bucket);
  if (rateLimitBuckets.size > 2_000) {
    for (const [storedKey, stored] of rateLimitBuckets) if (stored.resetAt <= now) rateLimitBuckets.delete(storedKey);
  }
  return bucket.count <= limit ? null : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

function clientAddress(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => part.trim().split("=")).filter(([name, value]) => name && value));
}

function rejectUnsafeRequest(req, res, key, limit, windowMs, allowedOrigins = []) {
  if (!requestOriginIsAllowed(req, allowedOrigins)) {
    json(res, 403, { error: "Request origin is not allowed" }, req);
    return true;
  }
  const retryAfter = rateLimit(req, key, limit, windowMs);
  if (retryAfter) {
    res.setHeader("Retry-After", String(retryAfter));
    json(res, 429, { error: "Too many requests. Please try again shortly." }, req);
    return true;
  }
  return false;
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

function gmailConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `http://localhost:${port}/api/gmail/oauth2callback`,
    appBaseUrl: String(process.env.APP_BASE_URL || "").trim().replace(/\/$/, ""),
    notificationEmail: process.env.GMAIL_NOTIFICATION_EMAIL || "",
    testRecipientEmail: process.env.GMAIL_TEST_RECIPIENT_EMAIL || "",
    adminEmails: String(process.env.GMAIL_ADMIN_EMAILS || "").split(",").map((email) => email.trim()).filter(Boolean),
    allowedOrigins: (process.env.GMAIL_ALLOWED_ORIGINS || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

function isAllowedNotificationOrigin(origin, config) {
  if (!origin) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return config.allowedOrigins.includes(origin);
}

function publicAppUrl(req) {
  const configured = gmailConfig().appBaseUrl;
  if (configured) return configured;
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  return `${forwardedProto}://${req.headers.host || `localhost:${port}`}`;
}

function appendAppLink(text, req) {
  return `${text}\n\nOpen Raise Local: ${publicAppUrl(req)}`;
}

async function readGmailToken() {
  if (process.env.GMAIL_REFRESH_TOKEN) {
    return { refresh_token: process.env.GMAIL_REFRESH_TOKEN };
  }
  try {
    return JSON.parse(await readFile(gmailTokenPath, "utf8"));
  } catch {
    return null;
  }
}

async function exchangeGoogleToken(params) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error_description || payload.error || "Google authorization failed"), { status: response.status });
  return payload;
}

async function gmailAccessToken() {
  const token = await readGmailToken();
  if (!token) return null;
  if (token.access_token && token.expires_at && token.expires_at > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) return null;
  const config = gmailConfig();
  const refreshed = await exchangeGoogleToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });
  await writeFile(gmailTokenPath, JSON.stringify({ ...token, ...refreshed, expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000 }), { mode: 0o600 });
  return refreshed.access_token;
}

function gmailRawMessage({ to, subject, text }) {
  const mime = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    "",
    text,
  ].join("\\r\\n");
  return Buffer.from(mime).toString("base64url");
}

async function sendGmailMessage({ to, subject, text }) {
  const accessToken = await gmailAccessToken();
  if (!accessToken) throw Object.assign(new Error("Gmail is not connected yet"), { status: 503 });
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: gmailRawMessage({ to, subject, text }) }),
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error?.message || "Gmail send failed"), { status: response.status });
  return payload;
}

async function handleGmailApi(req, res, url) {
  const config = gmailConfig();
  if (url.pathname === "/api/gmail/status" && req.method === "GET") {
    const token = await readGmailToken();
    return json(res, 200, {
      configured: Boolean(config.clientId && config.clientSecret),
      connected: Boolean(token?.refresh_token),
      notificationEmail: Boolean(config.notificationEmail),
      testRecipientEmail: Boolean(config.testRecipientEmail),
      appBaseUrl: Boolean(config.appBaseUrl),
    }, req);
  }

  if (url.pathname === "/api/gmail/connect" && req.method === "GET") {
    if (!config.clientId || !config.clientSecret) return json(res, 503, { error: "Gmail OAuth is not configured on the server" }, req);
    const state = randomBytes(24).toString("hex");
    gmailAuthStates.set(state, Date.now() + 10 * 60 * 1000);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/gmail.send",
      state,
    });
    res.writeHead(302, {
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      "Set-Cookie": `rl_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/gmail; Max-Age=600`,
    });
    return res.end();
  }

  if (url.pathname === "/api/gmail/oauth2callback" && req.method === "GET") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const expiresAt = state ? gmailAuthStates.get(state) : null;
    const cookieState = parseCookies(req).rl_oauth_state;
    if (!expiresAt || expiresAt < Date.now() || !state || state !== cookieState) return json(res, 400, { error: "Gmail authorization expired or could not be verified. Start again." }, req);
    gmailAuthStates.delete(state);
    if (!code) return json(res, 400, { error: "Gmail authorization was not completed" }, req);
    const token = await exchangeGoogleToken({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: "authorization_code" });
    const previous = await readGmailToken();
    await writeFile(gmailTokenPath, JSON.stringify({ ...previous, ...token, expires_at: Date.now() + Number(token.expires_in || 3600) * 1000 }), { mode: 0o600 });
    res.writeHead(302, { Location: "/?gmail=connected", "Set-Cookie": "rl_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/gmail; Max-Age=0" });
    return res.end();
  }

  if (["/api/gmail/send-test", "/api/gmail/send-notification"].includes(url.pathname) && req.method === "POST") {
    const allowedOrigins = url.pathname === "/api/gmail/send-notification" ? config.allowedOrigins : [];
    if (rejectUnsafeRequest(req, res, `gmail:${url.pathname}`, 10, 60_000, allowedOrigins)) return;
    const body = await readBody(req);
    // Notifications are intentionally locked to the configured recipient.
    // Never accept an arbitrary `to` address from the browser.
    const to = url.pathname === "/api/gmail/send-test" ? (config.testRecipientEmail || config.notificationEmail) : config.notificationEmail;
    if (!to) return json(res, 400, { error: "Set GMAIL_NOTIFICATION_EMAIL on the server" }, req);
    const result = await sendGmailMessage({ to, subject: body.subject || "Raise Local test notification", text: appendAppLink(body.text || "Raise Local Gmail notifications are connected.", req) });
    return json(res, 200, { ok: true, id: result.id || null }, req);
  }

  if (url.pathname === "/api/gmail/send-change-notification" && req.method === "POST") {
    if (rejectUnsafeRequest(req, res, "gmail:change-notification", 20, 60_000)) return;
    const body = await readBody(req);
    const recipients = [...new Set([
      ...(Array.isArray(body.recipients) ? body.recipients : []),
      config.notificationEmail,
      ...config.adminEmails,
    ].map((email) => String(email || "").trim().toLowerCase()).filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))];
    if (!recipients.length) return json(res, 400, { error: "No valid notification recipients are configured" }, req);
    if (recipients.length > 6) return json(res, 400, { error: "Too many notification recipients" }, req);
    const subject = String(body.subject || "Raise Local record updated").slice(0, 180);
    const text = appendAppLink(String(body.text || "A Raise Local record was updated.").slice(0, 10_000), req);
    const results = [];
    for (const to of recipients) {
      const result = await sendGmailMessage({ to, subject, text });
      results.push({ to, id: result.id || null });
    }
    return json(res, 200, { ok: true, results }, req);
  }

  if (url.pathname === "/api/gmail/send-quiz-invite" && req.method === "POST") {
    if (rejectUnsafeRequest(req, res, "gmail:quiz-invite", 10, 60_000)) return;
    const body = await readBody(req);
    const recipient = String(body.recipient || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient)) return json(res, 400, { error: "Provide a valid quiz invite recipient" }, req);
    const audience = body.kind === "business" ? "business" : "nonprofit";
    const subject = `Complete your Raise Local ${audience} profile`;
    const text = appendAppLink(String(body.text || `You have been invited to complete your Raise Local ${audience} profile. Log in to Raise Local and open Match Finder to continue.`).slice(0, 10_000), req);
    const recipients = [...new Set([recipient, config.notificationEmail, ...config.adminEmails]
      .map((email) => String(email || "").trim().toLowerCase())
      .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))];
    const results = [];
    for (const to of recipients) {
      const result = await sendGmailMessage({ to, subject, text });
      results.push({ to, id: result.id || null });
    }
    return json(res, 200, { ok: true, results }, req);
  }

  return json(res, 404, { error: "Gmail route not found" }, req);
}

async function handleApi(req, res, url) {
  if (url.pathname.startsWith("/api/gmail/")) {
    try {
      return await handleGmailApi(req, res, url);
    } catch (error) {
      return json(res, error.status || 500, { error: error.message || "Gmail request failed" }, req);
    }
  }
  if (url.pathname === "/api/health" && req.method === "GET") {
    return json(res, 200, { ok: true, providers: { openai: Boolean(process.env.OPENAI_API_KEY), anthropic: Boolean(process.env.ANTHROPIC_API_KEY) } }, req);
  }

  if (url.pathname !== "/api/ai" || req.method !== "POST") return json(res, 404, { error: "API route not found" }, req);

  try {
    if (rejectUnsafeRequest(req, res, "ai", 30, 60_000)) return;
    const body = await readBody(req);
    const provider = body.provider === "anthropic" ? "anthropic" : body.provider === "openai" ? "openai" : null;
    if (!provider || !Array.isArray(body.messages) || !body.messages.length) return json(res, 400, { error: "Provide a provider and at least one message" }, req);
    if (body.messages.some((message) => !message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
      return json(res, 400, { error: "Messages must contain user or assistant roles and text content" }, req);
    }
    return json(res, 200, await callProvider({ provider, model: body.model, messages: body.messages, system: body.system || "", maxTokens: body.maxTokens }), req);
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "AI request failed" }, req);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(rootDir, requested));
  if (!filePath.startsWith(rootDir + sep)) return json(res, 403, { error: "Forbidden" }, req);
  try {
    const content = await readFile(filePath);
    applySecurityHeaders(res, req, filePath.endsWith(".html"));
    res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": filePath.endsWith(".html") ? "no-store" : "public, max-age=300" });
    res.end(content);
  } catch {
    json(res, 404, { error: "File not found" }, req);
  }
});

server.listen(port, "0.0.0.0", () => console.log(`Raise Local server running at http://localhost:${port}`));
