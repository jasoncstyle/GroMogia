import {
  configuredGeoProvider,
  GEO_PROVIDER_NONE,
  geoLookupEnabled,
} from "@/lib/geo/provider";

/**
 * GEO provider adapter. Lookup stays off until a contracted adapter,
 * cost cap, and permission exist. This function never fetches.
 */
export type GeoAdapterRequest = {
  organizationId: string
  query: string
};

export type GeoAdapterResponse = {
  status: "off"
  reason: string
};

export function requestGeoLookup(input: GeoAdapterRequest): GeoAdapterResponse {
  if (!input.organizationId || !(input.query ?? "").trim()) {
    return {
      status: "off",
      reason: "Missing organization or query. GroovGro will not ask an AI system.",
    };
  }
  if (!geoLookupEnabled() || configuredGeoProvider() === GEO_PROVIDER_NONE) {
    return {
      status: "off",
      reason: "GEO lookup is off. GroovGro will not ask an AI system.",
    };
  }
  return {
    status: "off",
    reason: "No GEO adapter is configured. GroovGro will not ask an AI system.",
  };
}
