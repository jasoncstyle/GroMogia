/**
 * Later CMS writes must use a contracted adapter with permission and
 * review. This slice has no provider. GroovGro does not publish or
 * overwrite a connected website.
 */
export const CMS_PROVIDER_NONE = "none";

export function configuredCmsProvider(): typeof CMS_PROVIDER_NONE {
  return CMS_PROVIDER_NONE;
}

export function cmsPublishEnabled(): boolean {
  return false;
}
