import { describe, expect, it } from "vitest";
import { centsToBRL, brlToCents, formatBRL } from "@/lib/money";

describe("centsToBRL", () => {
  it("converts integer cents to float reais", () => {
    expect(centsToBRL(12345)).toBe(123.45);
  });
  it("returns 0 for 0 cents", () => {
    expect(centsToBRL(0)).toBe(0);
  });
});

describe("brlToCents", () => {
  it("parses BRL decimal string to integer cents", () => {
    expect(brlToCents("123,45")).toBe(12345);
    expect(brlToCents("1.234,56")).toBe(123456);
    expect(brlToCents("R$ 99,90")).toBe(9990);
  });
  it("returns null for invalid input", () => {
    expect(brlToCents("abc")).toBeNull();
    expect(brlToCents("")).toBeNull();
  });
});

describe("formatBRL", () => {
  it("formats integer cents as BRL currency string", () => {
    expect(formatBRL(12345)).toBe("R$\u00a0123,45");
    expect(formatBRL(0)).toBe("R$\u00a00,00");
    expect(formatBRL(99)).toBe("R$\u00a00,99");
  });
});
