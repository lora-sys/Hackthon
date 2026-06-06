import { describe, expect, it } from "vitest";
import { buildEventStream, buildTopology } from "./dashboard-data";

const agents = Array.from({ length: 57 }, (_, index) => ({
  agent_id: `agent:audience:${index.toString().padStart(3, "0")}`,
  did: `did:wishlive:audience:${index}`,
  wallet: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
  type: "audience" as const,
  skills: ["submit_wish"],
  tags: [],
  reputation: 70,
  metadata: { name: `Audience Agent ${index}` }
}));

describe("dashboard data", () => {
  it("builds a node for every agent", () => {
    expect(buildTopology(agents).nodes).toHaveLength(57);
  });

  it("builds at least 20 stream rows for the dashboard", () => {
    expect(buildEventStream(agents)).toHaveLength(24);
  });
});
