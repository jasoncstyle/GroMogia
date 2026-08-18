export type PersonInput = {
  email?: string | null
  displayName?: string | null
  phone?: string | null
};

export type StoredContact = {
  id: string
  organizationId: string
  email: string | null
  displayName: string
  phone: string | null
};

export function normalizeEmail(email?: string | null): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function normalizePhone(phone?: string | null): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export function displayNameFrom(input: PersonInput): string {
  const name = input.displayName?.trim();
  if (name) return name;
  const email = normalizeEmail(input.email);
  if (email) return email.split("@")[0] ?? email;
  return "Unknown contact";
}

export function matchExistingContact(
  contacts: readonly StoredContact[],
  input: PersonInput,
): StoredContact | undefined {
  const email = normalizeEmail(input.email);
  if (!email) return undefined;
  return contacts.find((contact) => contact.email === email);
}

export function assertTenantContact(
  contact: Pick<StoredContact, "organizationId">,
  organizationId: string,
): void {
  if (contact.organizationId !== organizationId) {
    throw new Error("Tenant isolation violation");
  }
}

export type ContactStates = {
  isLead: boolean
  isCustomer: boolean
};

export function contactStates(input: {
  openLeadCount: number
  hasCustomerRecord: boolean
}): ContactStates {
  return {
    isLead: input.openLeadCount > 0,
    isCustomer: input.hasCustomerRecord,
  };
}

export function convertingLeadCreatesCustomerNotPerson(input: {
  contactId: string
  existingCustomerContactIds: readonly string[]
}): { contactId: string; createdNewPerson: boolean } {
  return {
    contactId: input.contactId,
    createdNewPerson: false,
    ...(input.existingCustomerContactIds.includes(input.contactId)
      ? {}
      : {}),
  };
}
