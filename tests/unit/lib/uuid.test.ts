import { describe, expect, it } from "vitest";
import { newId } from "@/lib/uuid";

describe("newId", () => {
  it("returns a UUID v4 string", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("generates unique values across invocations", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
  });
});
