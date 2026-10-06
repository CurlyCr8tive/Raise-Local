import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { argValue, createSupabaseAdmin, readEnv, requiredSupabaseEnv } from "./supabase-admin.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const DELETE_MOCK = process.argv.includes("--delete-mock");
const CONFIRM = argValue("--confirm", "");

readEnv(root);
const admin = createSupabaseAdmin(requiredSupabaseEnv());

// Only list legacy fake/demo records here. Real nonprofits and real business
// leads must be preserved even when they were seeded for a presentation path.
const LEGACY_FAKE_REQUEST_IDS = [
  "request-fresh-start",
  "request-art-room",
];
const LEGACY_FAKE_BUSINESS_IDS = [
  "biz-paper-porch",
];
const LEGACY_FAKE_REQUEST_NAMES = ["PS 120", "PS 118 Art Room", "Fresh Start Pantry"];
const LEGACY_FAKE_BUSINESS_NAMES = ["Paper Porch"];

async function rows(table, query) {
  return admin.rest(`${table}?${query}&select=*`);
}

const [mockRequestsByEmail, mockRequestsById, mockRequestsByName, mockBusinessesByEmail, mockBusinessesById, mockBusinessesByName] = await Promise.all([
  rows("campaign_requests", "email=ilike.*.example"),
  rows("campaign_requests", `id=in.(${LEGACY_FAKE_REQUEST_IDS.join(",")})`),
  rows("campaign_requests", `organization_name=in.(${LEGACY_FAKE_REQUEST_NAMES.map(encodeURIComponent).join(",")})`),
  rows("business_profiles", "email=ilike.*.example"),
  rows("business_profiles", `id=in.(${LEGACY_FAKE_BUSINESS_IDS.join(",")})`),
  rows("business_profiles", `name=in.(${LEGACY_FAKE_BUSINESS_NAMES.map(encodeURIComponent).join(",")})`),
]);

const requestIds = [...new Set([...mockRequestsByEmail, ...mockRequestsById, ...mockRequestsByName].map((row) => row.id))];
const businessIds = [...new Set([...mockBusinessesByEmail, ...mockBusinessesById, ...mockBusinessesByName].map((row) => row.id))];

console.log("Raise Local live-data audit");
console.log(`Supabase: ${new URL(process.env.SUPABASE_URL).host}`);
console.log(`Legacy fake/mock campaign requests found: ${requestIds.length}`);
requestIds.forEach((id) => console.log(`  - ${id}`));
console.log(`Legacy fake/mock business profiles found: ${businessIds.length}`);
businessIds.forEach((id) => console.log(`  - ${id}`));

if (!DELETE_MOCK) {
  console.log("\nDry run only. Re-run with --delete-mock --confirm DELETE_MOCK_DATA to delete only these legacy fake/mock live Supabase rows.");
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
