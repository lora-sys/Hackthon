import { describe, expect, it } from "vitest";
import { A2AMessageSchema, AgentCardSchema, EventEnvelopeSchema } from "../src";

describe("shared schemas", () => {
  it("validates an AgentCard", () => {
    const card = AgentCardSchema.parse({
      agent_id: "agent:musician:001",
      did: "did:wishlive:0xabc",
      wallet: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      type: "musician",
      skills: ["check_availability"],
      tags: ["genre:rock", "city:shanghai"],
      reputation: 85
    });

    expect(card.type).toBe("musician");
    expect(card.metadata).toEqual({});
  });

  it("validates event and A2A envelopes", () => {
    expect(
      EventEnvelopeSchema.parse({
        id: "evt-1",
        type: "wish.created",
        source: "agent:audience:001",
        timestamp: Date.now(),
        data: { city: "shanghai" },
        metadata: { traceId: "trace-1", spanId: "span-1" }
      }).type
    ).toBe("wish.created");

    expect(
      A2AMessageSchema.parse({
        id: "msg-1",
        workflowId: "wf-1",
        conversationId: "conv-1",
        sender: "agent:musician:001",
        receiver: "agent:venue:001",
        type: "PROPOSAL",
        payload: { splitPercentage: 25 },
        timestamp: new Date().toISOString()
      }).type
    ).toBe("PROPOSAL");
  });
});
