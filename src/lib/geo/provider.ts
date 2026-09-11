/**
 * Later AI-visibility lookups must use a contracted adapter with a cost
 * cap, confirmed API access, and permission. This slice has no provider.
 * GroovGro does not scrape AI answers or treat one answer as truth.
 */
export const GEO_PROVIDER_NONE = "none";

export function configuredGeoProvider(): typeof GEO_PROVIDER_NONE {
  return GEO_PROVIDER_NONE;
}

export function geoLookupEnabled(): boolean {
  return false;
}
