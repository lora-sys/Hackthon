import { describe, expect, it } from "vitest";
import { buildTopology, formatStreamEvent } from "./dashboard-data";

const agents = Array.from({ length: 57 }, (_, index) => ({
  agent_id: `agent:audience:${index.toString().padStart(3, "0")}`,
  did: `did:wishlive:audience:${index}`,
  wallet: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  type: "audience" as const,
  skills: ["submit_wish"],
  skill_details: [
    {
      id: "submit_wish",
      name: "Submit Wish",
      description: "Submit a wish",
      tags: ["wish"],
      examples: ["submit_wish"]
    }
  ],
  tags: [],
  reputation: 70,
  supported_interfaces: [
    {
      url: `redis://agent.task/agent:audience:${index.toString().padStart(3, "0")}`,
      protocol_binding: "Redis+JSON",
      protocol_version: "1.0",
      tenant: "wishlive"
    }
  ],
  capabilities: {
    streaming: true,
    push_notifications: false,
    tool_calls: true,
    a2a_discovery: true
  },
  default_input_modes: ["application/json", "text/plain"],
  default_output_modes: ["application/json", "text/plain"],
  listenStreams: ["wish.events"],
  emitEvents: ["wish.created"],
  metadata: { name: `Audience Agent ${index}` }
}));

describe("dashboard data", () => {
  it("builds a node for every agent", () => {
    expect(buildTopology(agents).nodes).toHaveLength(57);
  });

  it("formats Redis stream events for the dashboard", () => {
    expect(
      formatStreamEvent({
        stream: "wish.events",
        event: {
          id: "event:1",
          type: "wish.created",
          source: "agent:audience:001",
          timestamp: 1_789_000_000_000,
          data: { wishId: "wish:1", city: "shanghai" },
          metadata: { traceId: "trace:1", spanId: "span:1" }
        }
      })
    ).toMatchObject({
      id: "event:1",
      stream: "wish.events",
      type: "wish.created",
      agent: "audience:001",
      detail: "wishId:wish:1 · city:shanghai"
    });
  });
});
