/**
 * Search-based competitor discovery. Finding other businesses from
 * search terms needs a contracted adapter. This slice stays off.
 * GroovGro does not scrape Google, Bing, or social networks.
 */
export const COMPETITOR_SEARCH_PROVIDER_NONE = "none";

export function configuredCompetitorSearchProvider(): typeof COMPETITOR_SEARCH_PROVIDER_NONE {
  return COMPETITOR_SEARCH_PROVIDER_NONE;
}

export function competitorSearchEnabled(): boolean {
  return false;
}

export type CompetitorSearchRequest = {
  organizationId: string
  query: string
};

export type CompetitorSearchResponse = {
  status: "off"
  reason: string
};

export function requestCompetitorSearch(
  input: CompetitorSearchRequest,
): CompetitorSearchResponse {
  if (!input.organizationId || !(input.query ?? "").trim()) {
    return {
      status: "off",
      reason:
        "Missing organization or search. GroovGro will not scrape Google or invent competitors.",
    };
  }
  if (!competitorSearchEnabled()) {
    return {
      status: "off",
      reason:
        "Search-based competitor discovery is off. Save a competitor website you already know. GroovGro will not scrape Google.",
    };
  }
  return {
    status: "off",
    reason:
      "No competitor search adapter is configured. GroovGro will not scrape Google.",
  };
}
