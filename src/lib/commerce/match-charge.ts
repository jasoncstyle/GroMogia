export function isUnmatchedPaymentCopy(payment: {
  contactId: string | null
}): boolean {
  return payment.contactId == null;
}

export function labelForMatchedPerson(person: {
  displayName: string
  email: string | null
}): string {
  const name = person.displayName.trim();
  const email = person.email?.trim() ?? "";
  if (name && email) return `${name} (${email})`;
  return name || email || "This person";
}
