-- Expose only matching context to authenticated non-admin users.
-- Contact email, phone, and contact name remain available only on owned rows.

create or replace function public.get_campaign_match_pool()
returns setof jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'organization_name', organization_name,
    'organization_type', organization_type,
    'website', website,
    'social_links', social_links,
    'classification', classification,
    'communities_served', communities_served,
    'mission', mission,
    'audience_served', audience_served,
    'audience_size', audience_size,
    'campaign_description', campaign_description,
    'campaign_type', campaign_type,
    'funding_goal', funding_goal,
    'start_date', start_date,
    'end_date', end_date,
    'partnership_deadline', partnership_deadline,
    'timing_preference', timing_preference,
    'cause_area', cause_area,
    'business_preference', business_preference,
    'preferred_categories', preferred_categories,
    'event_type', event_type,
    'partnership_types_needed', partnership_types_needed,
    'support_needs', support_needs,
    'expected_participation', expected_participation,
    'minimum_size', minimum_size,
    'ideal_size', ideal_size,
    'geography', geography,
    'must_haves', must_haves,
    'nice_to_haves', nice_to_haves,
    'prior_fundraiser', prior_fundraiser,
    'campaign_stage', campaign_stage,
    'success_details', success_details,
    'status', status
  )
  from campaign_requests
  where auth.uid() is not null
    and not public.is_raise_local_admin();
$$;

create or replace function public.get_business_match_pool()
returns setof jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'website', website,
    'social_links', social_links,
    'category', category,
    'business_goals', business_goals,
    'service_areas', service_areas,
    'fulfillment_scope', fulfillment_scope,
    'cause_areas', cause_areas,
    'contribution_types', contribution_types,
    'partnership_types', partnership_types,
    'offer_types', offer_types,
    'products_services', products_services,
    'average_price_range', average_price_range,
    'pricing_point', pricing_point,
    'minimum_order_requirement', minimum_order_requirement,
    'minimum_capacity', minimum_capacity,
    'maximum_capacity', maximum_capacity,
    'ideal_event_size', ideal_event_size,
    'campaign_cap', campaign_cap,
    'active_campaigns', active_campaigns,
    'estimated_unit_contribution', estimated_unit_contribution,
    'availability_preference', availability_preference,
    'available_from', available_from,
    'available_to', available_to,
    'lead_time_days', lead_time_days,
    'fulfillment_options', fulfillment_options,
    'org_types_supported', org_types_supported,
    'notes', notes,
    'rating', rating,
    'review_note', review_note,
    'quality_status', quality_status,
    'unavailable', unavailable,
    'status', status
  )
  from business_profiles
  where auth.uid() is not null
    and not public.is_raise_local_admin();
$$;

revoke all on function public.get_campaign_match_pool() from public;
revoke all on function public.get_business_match_pool() from public;
grant execute on function public.get_campaign_match_pool() to authenticated;
grant execute on function public.get_business_match_pool() to authenticated;
