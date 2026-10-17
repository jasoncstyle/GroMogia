import { assertSameOrganization } from "@/lib/db/tenant";

export const TENANT_ISOLATION_ERROR = "Tenant isolation violation";

export function assertOwned(
  rowOrganizationId: string,
  sessionOrganizationId: string,
): void {
  assertSameOrganization(rowOrganizationId, sessionOrganizationId);
}

export function requireOwned<T extends { organizationId: string }>(
  row: T | undefined | null,
  organizationId: string,
  label: string,
): T {
  if (!row) throw new Error(`Unknown ${label}`);
  if (row.organizationId !== organizationId) {
    throw new Error(TENANT_ISOLATION_ERROR);
  }
  return row;
}

export function ownedById<T extends { id: string; organizationId: string }>(
  rows: Map<string, T>,
  id: string,
  organizationId: string,
  label: string,
): T {
  const row = rows.get(id);
  return requireOwned(row, organizationId, label);
}
