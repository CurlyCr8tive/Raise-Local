import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { argValue, createSupabaseAdmin, readEnv, requiredSupabaseEnv } from "./supabase-admin.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DELETE_MOCK = process.argv.includes("--delete-mock");
const CONFIRM = argValue("--confirm", "");

readEnv(root);
const admin = createSupabaseAdmin(requiredSupabaseEnv());

const DEMO_REQUEST_IDS = [
  "request-fresh-start",
  "request-grove-park",
  "request-unity-now",
  "request-art-room",
  "request-young-excellence",
];
const DEMO_BUSINESS_IDS = [
  "biz-yamaas",
  "biz-eyeland-vibes",
  "biz-first-choice-brew",
  "biz-sofia-grace",
  "biz-paper-porch",
];

async function rows(table, query) {
  return admin.rest(`${table}?${query}&select=*`);
}

const [mockRequestsByEmail, mockRequestsById, mockBusinessesByEmail, mockBusinessesById] = await Promise.all([
  rows("campaign_requests", "email=ilike.*.example"),
  rows("campaign_requests", `id=in.(${DEMO_REQUEST_IDS.join(",")})`),
  rows("business_profiles", "email=ilike.*.example"),
  rows("business_profiles", `id=in.(${DEMO_BUSINESS_IDS.join(",")})`),
]);

const requestIds = [...new Set([...mockRequestsByEmail, ...mockRequestsById].map((row) => row.id))];
const businessIds = [...new Set([...mockBusinessesByEmail, ...mockBusinessesById].map((row) => row.id))];

console.log("Raise Local live-data audit");
console.log(`Supabase: ${new URL(process.env.SUPABASE_URL).host}`);
console.log(`Mock/demo campaign requests found: ${requestIds.length}`);
requestIds.forEach((id) => console.log(`  - ${id}`));
console.log(`Mock/demo business profiles found: ${businessIds.length}`);
businessIds.forEach((id) => console.log(`  - ${id}`));

if (!DELETE_MOCK) {
  console.log("\nDry run only. Re-run with --delete-mock --confirm DELETE_MOCK_DATA to delete these live Supabase rows.");
  process.exit(0);
}

if (CONFIRM !== "DELETE_MOCK_DATA") {
  console.error("Refusing to delete without --confirm DELETE_MOCK_DATA.");
  process.exit(1);
}

for (const id of requestIds) {
  await admin.rest(`campaign_requests?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
  console.log(`Deleted campaign request ${id}`);
}
for (const id of businessIds) {
  await admin.rest(`business_profiles?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
  console.log(`Deleted business profile ${id}`);
}
console.log("Mock/demo live rows deleted.");
