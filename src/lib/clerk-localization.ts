import { PRODUCT_NAME } from "@/lib/brand";

/** Overrides Clerk widget copy so the old GroMogia application name is not shown. */
export const clerkLocalization = {
  signIn: {
    start: {
      title: `Sign in to ${PRODUCT_NAME}`,
      titleCombined: `Continue to ${PRODUCT_NAME}`,
      subtitle: "Welcome back. Use the same email you used before.",
      subtitleCombined: "Welcome back. Use the same email you used before.",
    },
  },
  signUp: {
    start: {
      title: `Create your ${PRODUCT_NAME} account`,
      titleCombined: `Create your ${PRODUCT_NAME} account`,
      subtitle: `This is the ${PRODUCT_NAME} workspace, not the customer website.`,
      subtitleCombined: `This is the ${PRODUCT_NAME} workspace, not the customer website.`,
    },
  },
};
