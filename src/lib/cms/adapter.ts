import {
  CMS_PROVIDER_NONE,
  cmsPublishEnabled,
  configuredCmsProvider,
} from "@/lib/cms/provider";

/**
 * CMS publish adapter. Publishing stays off until a contracted adapter
 * and owner approval exist. This function never fetches or writes.
 */
export type CmsAdapterRequest = {
  organizationId: string
  draftId: string
  title: string
};

export type CmsAdapterResponse = {
  status: "off"
  reason: string
};

export function requestCmsPublish(input: CmsAdapterRequest): CmsAdapterResponse {
  if (!input.organizationId || !(input.draftId ?? "").trim()) {
    return {
      status: "off",
      reason:
        "Missing organization or draft. GroovGro will not publish or change the live website.",
    };
  }
  if (!cmsPublishEnabled() || configuredCmsProvider() === CMS_PROVIDER_NONE) {
    return {
      status: "off",
      reason:
        "CMS publishing is off. GroovGro will not publish or change the live website.",
    };
  }
  return {
    status: "off",
    reason:
      "No CMS adapter is configured. GroovGro will not publish or change the live website.",
  };
}
