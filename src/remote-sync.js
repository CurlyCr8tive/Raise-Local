import { supabase } from "./supabase-client.js";

function isDemoMode() {
  return sessionStorage.getItem("raise_local_demo_mode") === "true";
}

// Intake submissions use the anon INSERT policies. Quality-control writes use
// the authenticated admin policies in the latest Supabase migration.

function toRequestRow(request) {
  return {
    id: request.id,
    organization_name: request.organizationName,
    organization_type: request.organizationType,
    website: request.website,
    social_links: request.socialLinks,
    classification: request.classification,
    contact_name: request.contactName,
    email: request.email,
    phone: request.phone,
    communities_served: request.communitiesServed,
    mission: request.mission,
    audience_served: request.audienceServed,
    audience_size: request.audienceSize,
    campaign_description: request.campaignDescription,
    funding_goal: request.fundingGoal,
    start_date: request.startDate || null,
    end_date: request.endDate || null,
    partnership_deadline: request.partnershipDeadline || null,
    timing_preference: request.timingPreference,
    cause_area: request.causeArea,
    business_preference: request.businessPreference,
    preferred_categories: request.preferredCategories || [],
    event_type: request.eventType,
    partnership_types_needed: request.partnershipTypesNeeded || [],
    support_needs: request.supportNeeds || [],
    expected_participation: request.expectedParticipation,
    minimum_size: request.minimumSize,
    ideal_size: request.idealSize,
    geography: request.geography,
    must_haves: request.mustHaves,
    nice_to_haves: request.niceToHaves,
    prior_fundraiser: request.priorFundraiser,
    campaign_stage: request.campaignStage || "submitted",
    success_details: request.successDetails || "",
    status: request.status,
  };
}

function toBusinessRow(business) {
  return {
    id: business.id,
    name: business.name,
    website: business.website,
    social_links: business.socialLinks,
    contact_name: business.contactName,
    email: business.email,
    phone: business.phone,
    category: business.category,
    business_goals: business.businessGoals || [],
    service_areas: business.serviceAreas || [],
    fulfillment_scope: business.fulfillmentScope,
    cause_areas: business.causeAreas || [],
    contribution_types: business.contributionTypes || [],
    partnership_types: business.partnershipTypes || [],
    offer_types: business.offerTypes || [],
    products_services: business.productsServices,
    average_price_range: business.averagePriceRange,
    minimum_order_requirement: business.minimumOrderRequirement,
    minimum_capacity: business.minimumCapacity,
    maximum_capacity: business.maximumCapacity,
    ideal_event_size: business.idealEventSize,
    campaign_cap: business.campaignCap,
    active_campaigns: business.activeCampaigns,
    estimated_unit_contribution: business.estimatedUnitContribution,
    availability_preference: business.availabilityPreference,
    available_from: business.availableFrom || null,
    available_to: business.availableTo || null,
    lead_time_days: business.leadTimeDays,
    fulfillment_options: business.fulfillmentOptions || [],
    org_types_supported: business.orgTypesSupported || [],
    notes: business.notes,
    rating: business.rating,
    review_note: business.reviewNote,
    unavailable: business.unavailable,
    status: business.status,
    quality_status: business.qualityStatus || "clear",
  };
}

function fromRequestRow(row) {
  return {
    id: row.id,
    organizationName: row.organization_name,
    organizationType: row.organization_type,
    website: row.website || "",
    socialLinks: row.social_links || "",
    classification: row.classification || "",
    contactName: row.contact_name || "",
    email: row.email || "",
    phone: row.phone || "",
    communitiesServed: row.communities_served || "",
    mission: row.mission || "",
    audienceServed: row.audience_served || "",
    audienceSize: row.audience_size || 0,
    campaignDescription: row.campaign_description || "",
    fundingGoal: row.funding_goal || 0,
    startDate: row.start_date || "",
    endDate: row.end_date || "",
    partnershipDeadline: row.partnership_deadline || "",
    timingPreference: row.timing_preference || "",
    causeArea: row.cause_area || "",
    businessPreference: row.business_preference || "",
    preferredCategories: row.preferred_categories || [],
    eventType: row.event_type || "",
    partnershipTypesNeeded: row.partnership_types_needed || [],
    supportNeeds: row.support_needs || [],
    expectedParticipation: row.expected_participation || 0,
    minimumSize: row.minimum_size || 0,
    idealSize: row.ideal_size || 0,
    geography: row.geography || "",
    mustHaves: row.must_haves || "",
    niceToHaves: row.nice_to_haves || "",
    priorFundraiser: row.prior_fundraiser || "",
    campaignStage: row.campaign_stage || row.status || "submitted",
    successDetails: row.success_details || "",
    status: row.status || "new",
    rating: row.rating ?? null,
    reviewNote: row.review_note || "",
  };
}

function fromBusinessRow(row) {
  return {
    id: row.id,
    name: row.name,
    website: row.website || "",
    socialLinks: row.social_links || "",
    contactName: row.contact_name || "",
    email: row.email || "",
    phone: row.phone || "",
    category: row.category || "",
    businessGoals: row.business_goals || [],
    serviceAreas: row.service_areas || [],
    fulfillmentScope: row.fulfillment_scope || "",
    causeAreas: row.cause_areas || [],
    contributionTypes: row.contribution_types || [],
    partnershipTypes: row.partnership_types || [],
    offerTypes: row.offer_types || [],
    productsServices: row.products_services || "",
    averagePriceRange: row.average_price_range || "",
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
    notes: row.notes || "",
    rating: row.rating ?? null,
    reviewNote: row.review_note || "",
    qualityStatus: row.quality_status || "clear",
    unavailable: Boolean(row.unavailable),
    status: row.status || "ready",
  };
}

function fromMatchRow(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    businessId: row.business_id,
    status: row.status || "suggested",
    nonprofitDecision: row.nonprofit_decision || "",
    businessDecision: row.business_decision || "",
    outreachStatus: row.outreach_status || "not_started",
    outreachMessage: row.outreach_message || "",
    outreachAt: row.outreach_at || "",
    declineReason: row.decline_reason || "",
    declineNote: row.decline_note || "",
    adminNote: row.admin_note || "",
    notifiedAt: row.notified_at || "",
  };
}

export async function loadRemoteData({ admin = false, email = "" } = {}) {
  if (isDemoMode()) return null;
  let requestQuery = supabase.from("campaign_requests").select("*");
  let businessQuery = supabase.from("business_profiles").select("*");
  if (!admin) {
    requestQuery = requestQuery.eq("email", email);
    businessQuery = businessQuery.eq("email", email);
  }

  const [requestsResult, businessesResult, matchesResult] = await Promise.all([
    requestQuery,
    businessQuery,
    supabase.from("matches").select("*")
  ]);
  const failed = [requestsResult, businessesResult, matchesResult].find((result) => result.error);
  if (failed) {
    console.error("Supabase remote data load failed:", failed.error.message);
    return null;
  }

  return {
    campaignRequests: (requestsResult.data || []).map(fromRequestRow),
    businesses: (businessesResult.data || []).map(fromBusinessRow),
    matches: (matchesResult.data || []).map(fromMatchRow),
  };
}

export async function syncCampaignRequest(request) {
  if (isDemoMode()) return false;
  const { error } = await supabase.from("campaign_requests").insert(toRequestRow(request));
  if (error) console.error("Supabase campaign_requests sync failed:", error.message);
  return !error;
}

export async function syncBusinessProfile(business) {
  if (isDemoMode()) return false;
  const { error } = await supabase.from("business_profiles").insert(toBusinessRow(business));
  if (error) console.error("Supabase business_profiles sync failed:", error.message);
  return !error;
}

export async function updateCampaignRequest(request) {
  if (isDemoMode()) return false;
  const { error } = await supabase
    .from("campaign_requests")
    .update({ ...toRequestRow(request), updated_at: new Date().toISOString() })
    .eq("id", request.id);
  if (error) console.error("Supabase campaign_requests update failed:", error.message);
  return !error;
}

export async function updateBusinessProfile(business) {
  if (isDemoMode()) return false;
  const { error } = await supabase
    .from("business_profiles")
    .update({ ...toBusinessRow(business), updated_at: new Date().toISOString() })
    .eq("id", business.id);
  if (error) console.error("Supabase business_profiles update failed:", error.message);
  return !error;
}

export async function syncMatchDecision({ requestId, businessId, status, fromStatus = null, nonprofitDecision = "", businessDecision = "", outreachStatus = "not_started", outreachMessage = "", outreachAt = null, declineReason = "", declineNote = "", adminNote = "", notifiedAt = null }) {
  if (isDemoMode()) return false;
  const { data: match, error } = await supabase
    .from("matches")
    .upsert(
      {
        request_id: requestId,
        business_id: businessId,
        status,
        nonprofit_decision: nonprofitDecision || null,
        business_decision: businessDecision || null,
        outreach_status: outreachStatus || "not_started",
        outreach_message: outreachMessage || null,
        outreach_at: outreachAt || null,
        decline_reason: declineReason || null,
        decline_note: declineNote || null,
        admin_note: adminNote || null,
        notified_at: notifiedAt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "request_id,business_id" }
    )
    .select("id")
    .single();
  if (error) {
    console.error("Supabase match sync failed:", error.message);
    return false;
  }

  if (fromStatus !== status) {
    const { error: eventError } = await supabase.from("match_events").insert({
      match_id: match.id,
      event_type: "status_changed",
      from_status: fromStatus,
      to_status: status,
    });
    if (eventError) console.error("Supabase match event sync failed:", eventError.message);
  }
  return true;
}

export async function syncMatchFeedback({ requestId, businessId, declineReason = "", declineNote = "", adminNote = "" }) {
  if (isDemoMode()) return false;
  const fields = {
    decline_reason: declineReason || null,
    decline_note: declineNote || null,
    admin_note: adminNote || null,
    updated_at: new Date().toISOString(),
  };
  const { data: existing, error: lookupError } = await supabase
    .from("matches")
    .select("id")
    .eq("request_id", requestId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (lookupError) {
    console.error("Supabase match feedback lookup failed:", lookupError.message);
    return false;
  }

  if (existing) {
    const { error } = await supabase.from("matches").update(fields).eq("id", existing.id);
    if (error) console.error("Supabase match feedback sync failed:", error.message);
    return !error;
  }

  const { error } = await supabase.from("matches").insert({
    request_id: requestId,
    business_id: businessId,
    status: "recommended",
    ...fields,
  });
  if (error) console.error("Supabase match feedback create failed:", error.message);
  return !error;
}

export async function syncBusinessQuality(business) {
  if (isDemoMode()) return false;
  const { error } = await supabase
    .from("business_profiles")
    .update({
      rating: business.rating ?? null,
      review_note: business.reviewNote || null,
      unavailable: Boolean(business.unavailable),
      status: business.status || "ready",
      quality_status: business.qualityStatus || "clear",
      updated_at: new Date().toISOString(),
    })
    .eq("id", business.id);
  if (error) console.error("Supabase business quality sync failed:", error.message);
  return !error;
}

export async function syncBusinessRating(business, rating, note) {
  if (isDemoMode()) return false;
  const { error } = await supabase.from("ratings").insert({
    business_id: business.id,
    rating,
    review_note: note || null,
  });
  if (error) console.error("Supabase rating sync failed:", error.message);
  // A Supabase trigger aggregates the rating and sets the review flag. This
  // keeps regular authenticated users from needing direct profile update access.
  return !error;
}
