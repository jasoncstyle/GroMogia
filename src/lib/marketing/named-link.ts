export function slugForCampaignPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 80);
}

export function namedLeadFormUrl(
  baseUrl: string,
  source: string,
  campaign = "",
): string {
  const url = new URL(baseUrl);
  const src = slugForCampaignPart(source);
  const camp = slugForCampaignPart(campaign);
  if (src) url.searchParams.set("utm_source", src);
  if (camp) url.searchParams.set("utm_campaign", camp);
  return url.toString();
}
