import { describe, expect, it } from "vitest";
import { matchingReadiness } from "./matching-readiness";
describe("matching readiness", () => {
  it("rejects missing and empty results", () => {
    expect(matchingReadiness(null).ready).toBe(false);
    expect(matchingReadiness({ musicians: [], venues: [] }).ready).toBe(false);
  });
  it("requires both candidate types", () => {
    expect(matchingReadiness({ musicians: [{}], venues: [] }).ready).toBe(false);
    expect(matchingReadiness({ musicians: [], venues: [{}] }).ready).toBe(false);
    expect(matchingReadiness({ musicians: [{}], venues: [{}] }).ready).toBe(true);
  });
});
