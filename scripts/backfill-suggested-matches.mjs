import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { buildMatches } from "../src/matching.js";
import { createSupabaseAdmin, readEnv, requiredSupabaseEnv } from "./supabase-admin.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
readEnv(root);
const admin = createSupabaseAdmin(requiredSupabaseEnv());

function requestFromRow(row) {
  return {
    id: row.id,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    causeArea: row.cause_area || "",
    businessPreference: row.business_preference || "",
    preferredCategories: row.preferred_categories || [],
    supportNeeds: row.support_needs || [],
    partnershipTypesNeeded: row.partnership_types_needed || [],
    expectedParticipation: row.expected_participation || 0,
    minimumSize: row.minimum_size || 0,
    idealSize: row.ideal_size || 0,
    fundingGoal: row.funding_goal || 0,
    geography: row.geography || "",
    timingPreference: row.timing_preference || "",
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    email: row.email || "",
  };
}

function businessFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "",
    businessGoals: row.business_goals || [],
    serviceAreas: row.service_areas || [],
    fulfillmentScope: row.fulfillment_scope || "",
    causeAreas: row.cause_areas || [],
    contributionTypes: row.contribution_types || [],
    partnershipTypes: row.partnership_types || [],
    offerTypes: row.offer_types || [],
    productsServices: row.products_services || "",
    minimumOrderRequirement: row.minimum_order_requirement || 0,
    minimumCapacity: row.minimum_capacity || 0,
    maximumCapacity: row.maximum_capacity || 0,
    idealEventSize: row.ideal_event_size || 0,
    campaignCap: row.campaign_cap || 0,
    activeCampaigns: row.active_campaigns || 0,
    estimatedUnitContribution: row.estimated_unit_contribution || 0,
    availabilityPreference: row.availability_preference || "",
    availableFrom: row.available_from || "",
    availableTo: row.available_to || "",
    leadTimeDays: row.lead_time_days || 0,
    fulfillmentOptions: row.fulfillment_options || [],
    orgTypesSupported: row.org_types_supported || [],
    unavailable: Boolean(row.unavailable),
    status: row.status || "ready",
    qualityStatus: row.quality_status || "clear",
    email: row.email || "",
  };
}

const [requestRows, businessRows, existingRows] = await Promise.all([
  admin.rest("campaign_requests?select=*"),
  admin.rest("business_profiles?select=*"),
  admin.rest("matches?select=*"),
]);

const existingByPair = new Map(existingRows.map((row) => [`${row.request_id}:${row.business_id}`, row]));
const requests = requestRows.map(requestFromRow);
const businesses = businessRows.map(businessFromRow);
const suggestedMatches = buildMatches(requests, businesses, existingRows.map((row) => ({
  requestId: row.request_id,
  businessId: row.business_id,
  status: row.status,
  nonprofitDecision: row.nonprofit_decision,
  businessDecision: row.business_decision,
  outreachStatus: row.outreach_status,
  outreachMessage: row.outreach_message,
  outreachAt: row.outreach_at,
  declineReason: row.decline_reason,
  declineNote: row.decline_note,
  adminNote: row.admin_note,
  notifiedAt: row.notified_at,
}))).filter((match) => match.status === "suggested");

let created = 0;
let skipped = 0;

for (const match of suggestedMatches) {
  const key = `${match.request.id}:${match.business.id}`;
  if (existingByPair.has(key)) {
    skipped += 1;
    continue;
  }

  const [createdMatch] = await admin.rest("matches?on_conflict=request_id,business_id&select=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      request_id: match.request.id,
      business_id: match.business.id,
      status: "suggested",
      outreach_status: "not_started",
      updated_at: new Date().toISOString(),
    },
  });

  if (createdMatch?.id) {
    await admin.rest("match_events", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        match_id: createdMatch.id,
        event_type: "suggested_match_created",
        from_status: null,
        to_status: "suggested",
        note: "Backfilled from current matching rules so live Supabase reflects generated match recommendations.",
      },
    });
  }
  created += 1;
}

console.log(`Suggested matches evaluated: ${suggestedMatches.length}`);
console.log(`Suggested matches created: ${created}`);
console.log(`Existing matches skipped: ${skipped}`);
