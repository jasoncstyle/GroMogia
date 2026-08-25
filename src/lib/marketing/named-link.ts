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

export type PublicLeadAttribution = {
  source: string
  campaignId: string | null
  channel: string
};

export function publicLeadAttribution(input: {
  utmSource?: string | null
  utmCampaign?: string | null
  campaign?: string | null
}): PublicLeadAttribution {
  const source = slugForCampaignPart(input.utmSource ?? "");
  const campaignId =
    slugForCampaignPart(input.utmCampaign ?? "") ||
    slugForCampaignPart(input.campaign ?? "") ||
    null;

  if (source) {
    return {
      source,
      campaignId,
      channel: source,
    };
  }

  if (campaignId) {
    return {
      source: "website_campaign",
      campaignId,
      channel: "campaign",
    };
  }

  return {
    source: "website",
    campaignId: null,
    channel: "website",
  };
}

export function formatLeadOrigin(source: string, campaign = ""): string {
  const place = source.trim();
  const share = campaign.trim();
  if (place && share) return `${place} · ${share}`;
  return place || share;
}
