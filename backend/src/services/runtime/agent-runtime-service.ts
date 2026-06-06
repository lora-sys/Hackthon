import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import type {
  AgentCard,
  AgentSession,
  AgentToolCall
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import { ensureLangfuse, langfuseTraceUrl } from "../observability";
import type { RegistryService } from "../registry";
import { createWishLiveModel, hasAIConfig, aiModelName } from "./ai-provider";
import { addRuntimeSession } from "./session-store";

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

const runtimeToolSchemas = {
  discover_agents: {
    description: "Discover candidate A2A AgentCards through the manager-backed registry.",
    inputSchema: z.object({
      type: z.enum(["audience", "musician", "venue", "manager", "business", "infrastructure"]).optional(),
      skill: z.string().optional(),
      genre: z.string().optional(),
      city: z.string().optional(),
      date: z.string().optional(),
      capacity: z.number().optional()
    })
  },
  check_availability: {
    description: "Check whether a musician or venue is available on a requested date.",
    inputSchema: z.object({
      agentId: z.string(),
      date: z.string()
    })
  },
  quote_price: {
    description: "Quote a venue base price for a show.",
    inputSchema: z.object({
      agentId: z.string(),
      expectedAudience: z.number().optional()
    })
  },
  propose_offer: {
    description: "Create a proposal offer from one agent to another.",
    inputSchema: z.object({
      from: z.string(),
      to: z.string(),
      venueFee: z.number(),
      splitPercentage: z.number()
    })
  },
  counter_offer: {
    description: "Counter an existing proposal.",
    inputSchema: z.object({
      from: z.string(),
      to: z.string(),
      venueFee: z.number(),
      splitPercentage: z.number()
    })
  },
  accept_offer: {
    description: "Accept a counter proposal.",
    inputSchema: z.object({
      from: z.string(),
      proposalId: z.string()
    })
  },
  update_reputation: {
    description: "Update reputation after a workflow action.",
    inputSchema: z.object({
      agentId: z.string(),
      delta: z.number(),
      reason: z.string()
    })
  }
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
    const model = aiModelName();
    const traceId = `trace:${crypto.randomUUID()}`;
    const langfuse = ensureLangfuse();
    let mode: AgentSession["mode"] = hasAIConfig() ? "real" : "simulated";

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
        trace_id: traceId,
        langfuse_enabled: langfuse.enabled,
        langfuse_trace_url: langfuseTraceUrl(traceId)
      },
      createdAt: now,
      updatedAt: now
    };

    await this.publishRuntime("agent.session.started", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      model,
      mode,
      langfuse_enabled: langfuse.enabled
    });

    await this.publishRuntime("agent.thought", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      mode,
      simulated: mode === "simulated",
      thought: `${agent.name ?? agent.agent_id} is selecting tools: ${input.tools.map((entry) => entry.name).join(", ")}`
    });

    let assistantText: string;
    if (mode === "real") {
      try {
        assistantText = await this.generateWithAISDK(agent, input, session);
        await this.executeMissingPlannedTools(agent, input, session, "real");
      } catch (error) {
        mode = "simulated";
        session.mode = mode;
        await this.publishRuntime("agent.thought", input.agentId, {
          sessionId,
          workflow_id: input.workflowId,
          agent_id: input.agentId,
          conversation_id: input.conversationId,
          mode,
          simulated: true,
          thought: `AI SDK model call failed; switching to deterministic simulated fallback: ${
            error instanceof Error ? error.message : "unknown model error"
          }`
        });
        await this.executePlannedTools(agent, input, session, mode);
        assistantText = simulatedMessage(agent, input, session, "AI SDK model failed");
      }
    } else {
      await this.executePlannedTools(agent, input, session, mode);
      assistantText = simulatedMessage(agent, input, session);
    }
    const message: AgentSessionMessage = {
      id: `message:${crypto.randomUUID()}`,
      role: "assistant",
      agentId: input.agentId,
      content: assistantText,
      createdAt: Date.now(),
      simulated: session.mode === "simulated"
    };
    session.messages.push(message);
    session.status = "COMPLETED";
    session.updatedAt = Date.now();

    await this.publishRuntime("agent.message", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      mode: session.mode,
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
          agentId: input.agentId,
          content: message.content,
          mode: session.mode,
          simulated: message.simulated
        }
      })
    );

    await this.publishRuntime("agent.session.completed", input.agentId, {
      sessionId,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      mode: session.mode,
      simulated: session.mode === "simulated",
      toolCallCount: session.toolCalls.length,
      messageCount: session.messages.length,
      langfuse_enabled: session.telemetry.langfuse_enabled,
      langfuse_trace_url: session.telemetry.langfuse_trace_url
    });

    addRuntimeSession(session);

    return session;
  }

  private async generateWithAISDK(agent: AgentCard, input: RunAgentInput, session: AgentSession) {
    const result = await generateText({
      model: createWishLiveModel(),
      system: agent.systemPrompt ?? `You are ${agent.name ?? agent.agent_id}, a WishLive A2A agent.`,
      prompt: [
        input.userMessage,
        `Workflow: ${input.workflowId}`,
        `Conversation: ${input.conversationId}`,
        `Required tools in order: ${input.tools.map((entry) => entry.name).join(", ")}`,
        "Use the available tools when useful, then summarize the decision in one concise paragraph."
      ].join("\n"),
      tools: this.buildAISDKTools(agent, input, session),
      toolChoice: input.tools.length ? "required" : "auto",
      stopWhen: stepCountIs(Math.max(2, input.tools.length + 1)),
      temperature: 0.2,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "wishlive.agent_runtime",
        metadata: {
          workflow_id: input.workflowId,
          agent_id: input.agentId,
          agent_type: agent.type,
          conversation_id: input.conversationId,
          model: aiModelName(),
          ...input.metadata
        }
      }
    });
    return result.text || simulatedMessage(agent, input, session, "AI SDK returned empty text");
  }

  private buildAISDKTools(agent: AgentCard, input: RunAgentInput, session: AgentSession) {
    const plannedInputs = new Map(input.tools.map((entry) => [entry.name, entry.input]));
    return Object.fromEntries(
      (Object.entries(runtimeToolSchemas) as Array<[RuntimeToolName, { description: string; inputSchema: z.ZodType }]>)
        .map(([name, schema]) => [
          name,
          tool({
            description: schema.description,
            inputSchema: schema.inputSchema,
            execute: async (toolInput, options) => {
              const mergedInput = {
                ...(plannedInputs.get(name) ?? {}),
                ...(typeof toolInput === "object" && toolInput ? (toolInput as Record<string, unknown>) : {})
              };
              const call = await this.executeTool(agent, name, mergedInput, input, "real", options.toolCallId);
              session.toolCalls.push(call);
              return call.output ?? {};
            }
          })
        ])
    );
  }

  private async executePlannedTools(
    agent: AgentCard,
    input: RunAgentInput,
    session: AgentSession,
    mode: AgentSession["mode"]
  ) {
    for (const plannedTool of input.tools) {
      const toolCall = await this.executeTool(agent, plannedTool.name, plannedTool.input, input, mode);
      session.toolCalls.push(toolCall);
    }
  }

  private async executeMissingPlannedTools(
    agent: AgentCard,
    input: RunAgentInput,
    session: AgentSession,
    mode: AgentSession["mode"]
  ) {
    const completed = new Set(session.toolCalls.map((entry) => entry.name));
    for (const plannedTool of input.tools) {
      if (!completed.has(plannedTool.name)) {
        const toolCall = await this.executeTool(agent, plannedTool.name, plannedTool.input, input, mode);
        session.toolCalls.push(toolCall);
      }
    }
  }

  private async executeTool(
    agent: AgentCard,
    name: RuntimeToolName,
    toolInput: Record<string, unknown>,
    input: RunAgentInput,
    mode: AgentSession["mode"],
    toolCallId = `tool:${crypto.randomUUID()}`
  ): Promise<AgentToolCall> {
    const toolCall: AgentToolCall = {
      id: toolCallId,
      name,
      input: toolInput,
      createdAt: Date.now()
    };

    await this.publishRuntime("agent.tool_call", agent.agent_id, {
      toolCallId: toolCall.id,
      toolName: name,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      input: toolInput,
      mode,
      simulated: mode === "simulated"
    });

    const output = await this.toolResult(name, toolInput, input);
    toolCall.output = output;
    toolCall.completedAt = Date.now();

    await this.publishRuntime("agent.tool_result", agent.agent_id, {
      toolCallId: toolCall.id,
      toolName: name,
      workflow_id: input.workflowId,
      agent_id: input.agentId,
      conversation_id: input.conversationId,
      output,
      mode,
      simulated: mode === "simulated"
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
