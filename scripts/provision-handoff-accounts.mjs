import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { argValue, createSupabaseAdmin, isEmail, readEnv, requiredSupabaseEnv } from "./supabase-admin.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const WRITE = process.argv.includes("--write");

readEnv(root);
const admin = createSupabaseAdmin(requiredSupabaseEnv());

function password() {
  return `RaiseLocal${randomBytes(4).toString("hex")}!26`;
}

function hasArg(name) {
  return process.argv.includes(name);
}

function accountPassword(prefix) {
  return hasArg(`${prefix}-password`) ? argValue(`${prefix}-password`, "") : "";
}

const accounts = [
  {
    label: "Tenyse admin",
    email: argValue("--tenyse-email", "").trim().toLowerCase(),
    name: argValue("--tenyse-name", "Tenyse Williams").trim(),
    role: "admin",
    password: accountPassword("--tenyse"),
  },
  {
    label: "Developer admin",
    email: argValue("--developer-email", "").trim().toLowerCase(),
    name: argValue("--developer-name", "Developer Admin").trim(),
    role: "admin",
    password: accountPassword("--developer"),
  },
  {
    label: "Jessica tester/admin",
    email: argValue("--jessica-email", "").trim().toLowerCase(),
    name: argValue("--jessica-name", "Jessica").trim(),
    role: "admin",
    password: accountPassword("--jessica"),
  },
  {
    label: "Internal nonprofit test",
    email: argValue("--nonprofit-email", "").trim().toLowerCase(),
    name: argValue("--nonprofit-name", "Internal Nonprofit Test").trim(),
    role: "nonprofit",
    password: accountPassword("--nonprofit"),
  },
  {
    label: "Internal business test",
    email: argValue("--business-email", "").trim().toLowerCase(),
    name: argValue("--business-name", "Internal Business Test").trim(),
    role: "business",
    password: accountPassword("--business"),
  },
].filter((account) => account.email);

if (!accounts.length) {
  console.error("No accounts requested. Provide at least --tenyse-email or another account email.");
  process.exit(1);
}

for (const account of accounts) {
  if (!isEmail(account.email)) {
    console.error(`${account.label} has an invalid email: ${account.email}`);
    process.exit(1);
  }
}

async function listUsers() {
  const users = [];
  for (let page = 1; page <= 20; page += 1) {
    const result = await admin.auth(`/users?page=${page}&per_page=1000`);
    const chunk = result.users || [];
    users.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return users;
}

const existingUsers = await listUsers();

async function applyAccount(account) {
  const existing = existingUsers.find((user) => user.email?.toLowerCase() === account.email);
  const userMetadata = { ...(existing?.user_metadata || {}), name: account.name, password_set: true };
  const appMetadata = { ...(existing?.app_metadata || {}) };
  if (account.role === "admin") appMetadata.role = "admin";
  else userMetadata.role = account.role;
  const assignedPassword = account.password || (existing ? "" : password());
  if (!WRITE) return { ...account, password: assignedPassword || "(unchanged)", exists: Boolean(existing), id: existing?.id || "(created on --write)" };
  if (existing) {
    const body = { email_confirm: true, user_metadata: userMetadata, app_metadata: appMetadata };
    if (assignedPassword) body.password = assignedPassword;
    await admin.auth(`/users/${existing.id}`, {
      method: "PUT",
      body,
    });
    return { ...account, password: assignedPassword || "(unchanged)", exists: true, id: existing.id };
  }
  const created = await admin.auth("/users", {
    method: "POST",
    body: { email: account.email, password: assignedPassword, email_confirm: true, user_metadata: userMetadata, app_metadata: appMetadata },
  });
  return { ...account, password: assignedPassword, exists: false, id: created.id };
}

const applied = [];
for (const account of accounts) applied.push(await applyAccount(account));

console.log(`Supabase: ${new URL(process.env.SUPABASE_URL).host}`);
console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}\n`);
for (const account of applied) {
  console.log(`- ${account.label}`);
  console.log(`  email: ${account.email}`);
  console.log(`  role: ${account.role}`);
  console.log(`  auth user: ${account.exists ? "existing user will be updated" : "new user will be created"}`);
  console.log(`  password: ${account.password}`);
}
if (!WRITE) console.log("\nDry run only. Re-run with --write after confirming emails.");
