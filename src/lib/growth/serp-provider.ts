/**
 * Later SERP / competitor lookups must use a contracted adapter with a cost
 * cap. This slice has no provider. GroovGro does not scrape search results
 * or competitor websites.
 */
export const SERP_PROVIDER_NONE = "none";

export function configuredSerpProvider(): typeof SERP_PROVIDER_NONE {
  return SERP_PROVIDER_NONE;
}

export function serpLookupEnabled(): boolean {
  return false;
}
