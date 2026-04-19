export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 0 ? null : digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${normalized}?text=${encoded}`;
}
