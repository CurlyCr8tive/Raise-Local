import { supabase } from "./supabase-client.js";

// Runs pre-auth, at quiz completion. RLS grants the anon role INSERT only on
// these two tables (see supabase/migrations) — no read/update/delete — so
// these functions cover just the initial submission. The later "Complete
// Profile" edit is authenticated but local-only: an anon-scoped policy can't
// tell one user's row from another's, so it isn't synced here either.

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
  };
}

export async function syncCampaignRequest(request) {
  const { error } = await supabase.from("campaign_requests").insert(toRequestRow(request));
  if (error) console.error("Supabase campaign_requests sync failed:", error.message);
  return !error;
}

export async function syncBusinessProfile(business) {
  const { error } = await supabase.from("business_profiles").insert(toBusinessRow(business));
  if (error) console.error("Supabase business_profiles sync failed:", error.message);
  return !error;
}
