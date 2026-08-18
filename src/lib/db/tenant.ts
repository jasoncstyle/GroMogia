export function assertSameOrganization(
  rowOrganizationId: string,
  sessionOrganizationId: string,
): void {
  if (rowOrganizationId !== sessionOrganizationId) {
    throw new Error("Tenant isolation violation");
  }
}

export function scoped<T extends { organizationId: string }>(
  rows: T[],
  organizationId: string,
): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}
