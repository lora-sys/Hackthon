import { tool } from "ai";
import { z } from "zod";
import type {
  AgentCard,
  AgentSession,
  AgentToolCall
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { RegistryService } from "../registry";

const RUNTIME_STREAM = "agent.runtime";
const AGENT_TASK_STREAM = "agent.task";

type AgentSessionMessage = AgentSession["messages"][number];

type RuntimeToolName =
  | "discover_agents"
  | "check_availability"
  | "quote_price"
  | "propose_offer"
  | "counter_offer"
  | "accept_offer"
  | "update_reputation";

type RunAgentInput = {
  agentId: string;
  workflowId: string;
  conversationId: string;
  userMessage: string;
  tools: Array<{
    name: RuntimeToolName;
    input: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
};

const runtimeTools = {
  discover_agents: tool({
    description: "Discover candidate A2A AgentCards through the manager-backed registry.",
    inputSchema: z.object({
      type: z.enum(["audience", "musician", "venue", "manager", "business", "infrastructure"]).optional(),
      skill: z.string().optional(),
      genre: z.string().optional(),
      city: z.string().optional(),
      date: z.string().optional(),
      capacity: z.number().optional()
    })
  }),
  check_availability: tool({
    description: "Check whether a musician or venue is available on a requested date.",
    inputSchema: z.object({
      agentId: z.string(),
      date: z.string()
    })
  }),
  quote_price: tool({
    description: "Quote a venue base price for a show.",
    inputSchema: z.object({
      agentId: z.string(),
      expectedAudience: z.number().optional()
    })
  }),
  propose_offer: tool({
    description: "Create a proposal offer from one agent to another.",
    inputSchema: z.object({
      from: z.string(),
      to: z.string(),
      venueFee: z.number(),
      splitPercentage: z.number()
    })
  }),
  counter_offer: tool({
    description: "Counter an existing proposal.",
    inputSchema: z.object({
      from: z.string(),
      to: z.string(),
      venueFee: z.number(),
      splitPercentage: z.number()
    })
  }),
  accept_offer: tool({
    description: "Accept a counter proposal.",
    inputSchema: z.object({
      from: z.string(),
      proposalId: z.string()
    })
  }),
  update_reputation: tool({
    description: "Update reputation after a workflow action.",
    inputSchema: z.object({
      agentId: z.string(),
      delta: z.number(),
      reason: z.string()
    })
  })
} satisfies Record<RuntimeToolName, unknown>;

export class AgentRuntimeService {
  constructor(
    private readonly registry: RegistryService,
    private readonly eventBus: EventBus = new MemoryEventBus()
  ) {}

  async run(input: RunAgentInput): Promise<AgentSession> {
    await this.registry.ensureSeeded();
    const agent = this.registry.get(input.agentId);
    const now = Date.now();
    const sessionId = `session:${crypto.randomUUID()}`;
    const model = process.env.OPENAI_MODEL ?? "fallback-simulated";
    const traceId = `trace:${crypto.randomUUID()}`;
    const mode = hasOpenAIConfig() ? "real" : "simulated";

    const session: AgentSession = {
      sessionId,
      workflowId: input.workflowId,
      conversationId: input.conversationId,
      agentId: input.agentId,
      mode,
      status: "RUNNING",
      messages: [],
      toolCalls: [],
      telemetry: {
        workflow_id: input.workflowId,
        agent_id: input.agentId,
        conversation_id: input.conversationId,
        model,
        trace_id: traceId
      },
      createdAt: now,
      updatedAt: now
    };

    await this.publishRuntime("agent.thought", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      conversation_id: input.conversationId,
      simulated: mode === "simulated",
      thought: `${agent.name ?? agent.agent_id} is selecting tools: ${input.tools.map((entry) => entry.name).join(", ")}`
    });

    for (const plannedTool of input.tools) {
      const toolCall = await this.executeTool(agent, plannedTool.name, plannedTool.input, input);
      session.toolCalls.push(toolCall);
    }

    const assistantText = await this.generateAssistantMessage(agent, input, session);
    const message: AgentSessionMessage = {
      id: `message:${crypto.randomUUID()}`,
      role: "assistant",
      agentId: input.agentId,
      content: assistantText,
      createdAt: Date.now(),
      simulated: mode === "simulated"
    };
    session.messages.push(message);
    session.status = "COMPLETED";
    session.updatedAt = Date.now();

    await this.publishRuntime("agent.message", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      conversation_id: input.conversationId,
      simulated: message.simulated,
      content: message.content,
      metadata: input.metadata ?? {}
    });

    await this.eventBus.publish(
      AGENT_TASK_STREAM,
      createEventEnvelope({
        type: "a2a.message",
        source: input.agentId,
        data: {
          sessionId,
          workflowId: input.workflowId,
          conversationId: input.conversationId,
          content: message.content,
          simulated: message.simulated
        }
      })
    );

    return session;
  }

  private async executeTool(
    agent: AgentCard,
    name: RuntimeToolName,
    toolInput: Record<string, unknown>,
    input: RunAgentInput
  ): Promise<AgentToolCall> {
    void runtimeTools[name];
    const toolCall: AgentToolCall = {
      id: `tool:${crypto.randomUUID()}`,
      name,
      input: toolInput,
      createdAt: Date.now()
    };

    await this.publishRuntime("agent.tool_call", agent.agent_id, {
      toolCallId: toolCall.id,
      toolName: name,
      workflow_id: input.workflowId,
      conversation_id: input.conversationId,
      input: toolInput,
      simulated: !hasOpenAIConfig()
    });

    const output = await this.toolResult(name, toolInput, input);
    toolCall.output = output;

    await this.publishRuntime("agent.tool_result", agent.agent_id, {
      toolCallId: toolCall.id,
      toolName: name,
      workflow_id: input.workflowId,
      conversation_id: input.conversationId,
      output,
      simulated: !hasOpenAIConfig()
    });

    return toolCall;
  }

  private async toolResult(
    name: RuntimeToolName,
    toolInput: Record<string, unknown>,
    input: RunAgentInput
  ): Promise<Record<string, unknown>> {
    if (name === "discover_agents") {
      const discovery = await this.registry.discover({
        ...toolInput,
        requesterAgentId: input.agentId,
        workflowId: input.workflowId,
        conversationId: input.conversationId
      });
      return {
        managerAgentId: discovery.managerAgentId,
        count: discovery.agents.length,
        agentIds: discovery.agents.map((agent) => agent.agent_id)
      };
    }

    if (name === "check_availability") {
      const agentId = String(toolInput.agentId ?? input.agentId);
      const date = String(toolInput.date ?? "");
      const agent = this.registry.get(agentId);
      const calendar = agent.metadata.availabilityCalendar ?? agent.metadata.availableDates;
      return {
        agentId,
        date,
        available: Array.isArray(calendar) ? calendar.includes(date) : true
      };
    }

    if (name === "quote_price") {
      const agentId = String(toolInput.agentId ?? input.agentId);
      const agent = this.registry.get(agentId);
      return {
        agentId,
        baseFee: Number(agent.metadata.baseFee ?? 5_000),
        splitPreference: Number(agent.metadata.splitPreference ?? 22)
      };
    }

    if (name === "propose_offer" || name === "counter_offer") {
      return {
        from: String(toolInput.from ?? input.agentId),
        to: String(toolInput.to ?? "unknown"),
        venueFee: Number(toolInput.venueFee ?? 5_000),
        splitPercentage: Number(toolInput.splitPercentage ?? 25),
        decision: name === "propose_offer" ? "proposed" : "countered"
      };
    }

    if (name === "accept_offer") {
      return {
        from: String(toolInput.from ?? input.agentId),
        proposalId: String(toolInput.proposalId ?? "proposal:pending"),
        decision: "accepted"
      };
    }

    return {
      agentId: String(toolInput.agentId ?? input.agentId),
      delta: Number(toolInput.delta ?? 1),
      reason: String(toolInput.reason ?? "workflow activity")
    };
  }

  private async generateAssistantMessage(agent: AgentCard, input: RunAgentInput, session: AgentSession) {
    if (!hasOpenAIConfig()) {
      return simulatedMessage(agent, input, session);
    }

    try {
      const response = await fetch(`${openAIBaseUrl()}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content: agent.systemPrompt ?? `You are ${agent.name ?? agent.agent_id}.`
            },
            {
              role: "user",
              content: `${input.userMessage}\nTool results: ${JSON.stringify(session.toolCalls.map((entry) => entry.output))}`
            }
          ]
        })
      });

      if (!response.ok) {
        return simulatedMessage(agent, input, session, `real model failed:${response.status}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content?.trim() || simulatedMessage(agent, input, session);
    } catch (error) {
      return simulatedMessage(agent, input, session, error instanceof Error ? error.message : "model error");
    }
  }

  private async publishRuntime(type: string, source: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      RUNTIME_STREAM,
      createEventEnvelope({
        type,
        source,
        data
      })
    );
  }
}

function hasOpenAIConfig() {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
}

function openAIBaseUrl() {
  return (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
}

function simulatedMessage(
  agent: AgentCard,
  input: RunAgentInput,
  session: AgentSession,
  reason = "missing OPENAI config"
) {
  const toolSummary = session.toolCalls
    .map((entry) => `${entry.name}:${JSON.stringify(entry.output)}`)
    .join(" | ");
  return `[simulated:${reason}] ${agent.name ?? agent.agent_id} handled ${input.userMessage}. Tools => ${toolSummary}`;
}
