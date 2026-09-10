/**
 * Owner-entered Business Brain extras that later SEO / content / GEO work
 * can read. GroovGro does not look up competitors or invent these lists.
 */
export type BrainSeoContext = {
  idealCustomers?: string[] | null
  painPoints?: string[] | null
  competitors?: string[] | null
  differentiators?: string[] | null
  prohibitedClaims?: string[] | null
};

function filled(values?: string[] | null): string[] {
  return (values ?? []).map((item) => item.trim()).filter(Boolean);
}

export function brainSeoContextSaved(brain?: BrainSeoContext | null): boolean {
  if (!brain) return false;
  return (
    filled(brain.idealCustomers).length > 0 ||
    filled(brain.painPoints).length > 0 ||
    filled(brain.competitors).length > 0 ||
    filled(brain.differentiators).length > 0 ||
    filled(brain.prohibitedClaims).length > 0
  );
}

export function brainSeoContextCounts(brain?: BrainSeoContext | null) {
  return {
    idealCustomers: filled(brain?.idealCustomers).length,
    painPoints: filled(brain?.painPoints).length,
    competitors: filled(brain?.competitors).length,
    differentiators: filled(brain?.differentiators).length,
    prohibitedClaims: filled(brain?.prohibitedClaims).length,
  };
}
