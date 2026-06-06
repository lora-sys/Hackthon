import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRuntimeService, MemoryEventBus, RegistryService } from "../src";

describe("agent runtime service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to simulated mode and emits tool events when AI config is absent", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("OPENAI_MODEL", "");
    const eventBus = new MemoryEventBus();
    const registry = new RegistryService(eventBus);
    const runtime = new AgentRuntimeService(registry, eventBus);

    const session = await runtime.run({
      agentId: "agent:business:005",
      workflowId: "workflow:test",
      conversationId: "conversation:test",
      userMessage: "Discover rock agents in shanghai",
      tools: [
        {
          name: "discover_agents",
          input: {
            type: "musician",
            skill: "check_availability",
            genre: "rock",
            city: "shanghai",
            date: "2026-07-17",
            limit: 3
          }
        }
      ]
    });

    expect(session.mode).toBe("simulated");
    expect(session.toolCalls).toHaveLength(1);
    expect(session.toolCalls[0]?.output?.count).toBe(3);
    expect(session.messages[0]?.simulated).toBe(true);
    expect(eventBus.byType("agent.thought")).toHaveLength(1);
    expect(eventBus.byType("agent.tool_call")).toHaveLength(1);
    expect(eventBus.byType("agent.tool_result")).toHaveLength(1);
    expect(eventBus.byType("agent.message")).toHaveLength(1);
    expect(eventBus.byType("a2a.discovery.result")).toHaveLength(1);
  });
});
