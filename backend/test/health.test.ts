import { describe, expect, it } from "vitest";
import { AgentCardSchema } from "@wishlive/shared";
import { createHealthPayload } from "../src";

describe("backend scaffold", () => {
  it("returns a health payload", () => {
    expect(createHealthPayload()).toMatchObject({
      service: "wishlive-backend",
      status: "ok"
    });
  });

  it("validates shared AgentCard input", () => {
    expect(
      AgentCardSchema.parse({
        agent_id: "agent:venue:001",
        did: "did:wishlive:venue001",
        wallet: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        type: "venue",
        skills: ["check_capacity"],
        tags: ["capacity:500"]
      }).type
    ).toBe("venue");
  });
});
