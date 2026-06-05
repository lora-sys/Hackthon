import { describe, expect, it } from "vitest";
import { demoFlow, demoMetrics } from "./demo";

describe("frontend scaffold demo data", () => {
  it("keeps the dashboard-first story visible", () => {
    expect(demoMetrics[0]?.value).toBe("57");
    expect(demoFlow).toContain("Negotiation");
    expect(demoFlow).toContain("Hardhat");
  });
});
