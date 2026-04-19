import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizePhone } from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("strips +, spaces, hyphens, parentheses", () => {
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
  });
  it("returns null if no digits", () => {
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with URL-encoded message", () => {
    const url = buildWhatsAppUrl("+5511987654321", "Olá, tudo bem?");
    expect(url).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });
  it("returns null when phone is invalid", () => {
    expect(buildWhatsAppUrl("not-a-phone", "hi")).toBeNull();
  });
});
