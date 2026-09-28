import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function readEnv(root) {
  for (const file of [".env", ".env.local"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "").trim();
    }
  }
}

export function requiredSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local.");
  }
  return { url, serviceKey };
}

export function argValue(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] || fallback;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function createSupabaseAdmin({ url, serviceKey }) {
  async function request(path, { method = "GET", body, prefer } = {}) {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
        ...(prefer ? { prefer } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    const parsed = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(parsed).slice(0, 300)}`);
    }
    return parsed;
  }

  return {
    auth: (path, options) => request(`/auth/v1/admin${path}`, options),
    rest: (path, options) => request(`/rest/v1/${path}`, options),
  };
}
