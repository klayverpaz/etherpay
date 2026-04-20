import { describe, it, expect } from "vitest";
import { initials } from "@/lib/initials";

describe("initials", () => {
  it("extrai iniciais de nome completo (2 letras)", () => {
    expect(initials("Marina Costa")).toBe("MC");
    expect(initials("João Silva")).toBe("JS");
  });

  it("usa as 2 primeiras letras de um nome único", () => {
    expect(initials("Madonna")).toBe("MA");
  });

  it("pega só primeira e última palavra em nomes compostos", () => {
    expect(initials("Maria Aparecida da Silva Santos")).toBe("MS");
  });

  it("retorna string vazia para input vazio", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("lida com letras maiúsculas e minúsculas", () => {
    expect(initials("joão da silva")).toBe("JS");
  });

  it("ignora espaços extras", () => {
    expect(initials("  Marina   Costa  ")).toBe("MC");
  });
});
