import { generateText, streamText } from "ai";
import { ConciergeChatRequestSchema, type AgentSession, type EventEnvelope } from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { RegistryService } from "../registry";
import type { NegotiationService } from "../negotiation";
import { listRuntimeSessions } from "../runtime";
import { createWishLiveModel, hasAIConfig, aiModelName } from "../runtime";
import { ensureLangfuse } from "../observability";

const CONCIERGE_STREAM = "concierge.events";

type ConciergeContext = {
  events: EventEnvelope[];
  sessions: AgentSession[];
  negotiations: unknown[];
  agentsOnline: unknown;
};

type ConciergeScope = {
  workflowId?: string | undefined;
  agentId?: string | undefined;
  conversationId?: string | undefined;
};

export class ConciergeService {
  constructor(
    private readonly registry: RegistryService,
    private readonly negotiation: NegotiationService,
    private readonly eventBus: EventBus = new MemoryEventBus()
  ) {}

  async answer(input: unknown) {
    const request = ConciergeChatRequestSchema.parse(input);
    const context = await this.context(request);
    const mode = hasAIConfig() ? "real" : "simulated";
    const content = mode === "real"
      ? await this.generate(request.message, context, request)
      : simulatedConcierge(request.message, context);

    await this.publish("concierge.message", {
      message: request.message,
      response: content,
      workflow_id: request.workflowId ?? null,
      agent_id: request.agentId ?? "agent:business:002",
      conversation_id: request.conversationId ?? null,
      mode,
      simulated: mode === "simulated",
      model: aiModelName(),
      langfuse_enabled: ensureLangfuse().enabled
    });

    return {
      mode,
      content,
      context
    };
  }

  async stream(input: unknown) {
    const request = ConciergeChatRequestSchema.parse(input);
    const context = await this.context(request);
    if (!hasAIConfig()) {
      const content = simulatedConcierge(request.message, context);
      await this.publish("concierge.message", {
        message: request.message,
        response: content,
        workflow_id: request.workflowId ?? null,
        agent_id: request.agentId ?? "agent:business:002",
        conversation_id: request.conversationId ?? null,
        mode: "simulated",
        simulated: true,
        model: aiModelName(),
        langfuse_enabled: ensureLangfuse().enabled
      });
      return new Response(content, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const result = streamText({
      model: createWishLiveModel(),
      system: conciergeSystemPrompt(),
      prompt: buildPrompt(request.message, context),
      temperature: 0.2,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "wishlive.concierge",
        metadata: {
          workflow_id: request.workflowId ?? "global",
          agent_id: request.agentId ?? "agent:business:002",
          conversation_id: request.conversationId ?? "concierge",
          model: aiModelName()
        }
      }
    });

    void result.text.then((content) =>
      this.publish("concierge.message", {
        message: request.message,
        response: content,
        workflow_id: request.workflowId ?? null,
        agent_id: request.agentId ?? "agent:business:002",
        conversation_id: request.conversationId ?? null,
        mode: "real",
        simulated: false,
        model: aiModelName(),
        langfuse_enabled: ensureLangfuse().enabled
      })
    );

    return result.toTextStreamResponse();
  }

  private async generate(message: string, context: ConciergeContext, request: ConciergeScope) {
    const result = await generateText({
      model: createWishLiveModel(),
      system: conciergeSystemPrompt(),
      prompt: buildPrompt(message, context),
      temperature: 0.2,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "wishlive.concierge.answer",
        metadata: {
          workflow_id: request.workflowId ?? "global",
          agent_id: request.agentId ?? "agent:business:002",
          conversation_id: request.conversationId ?? "concierge",
          model: aiModelName()
        }
      }
    });
    return result.text;
  }

  private async context(request: ConciergeScope) {
    await this.registry.ensureSeeded();
    const events = await this.readRecentEvents();
    return {
      events,
      sessions: listRuntimeSessions({
        agentId: request.agentId,
        workflowId: request.workflowId,
        conversationId: request.conversationId
      }).slice(0, 10),
      negotiations: this.negotiation.list(request.agentId ? { agentId: request.agentId } : {}).slice(0, 10),
      agentsOnline: this.registry.onlineCount()
    };
  }

  private async readRecentEvents() {
    if ("readRecent" in this.eventBus && typeof this.eventBus.readRecent === "function") {
      const entries = await this.eventBus.readRecent(
        [
          "agent.task",
          "agent.runtime",
          "a2a.discovery",
          "wish.events",
          "demand.events",
          "matching.events",
          "negotiation.events",
          "settlement.events",
          "show.events",
          "contract.events"
        ],
        20
      );
      return entries.map((entry: { event: EventEnvelope }) => entry.event).slice(0, 40);
    }
    if ("events" in this.eventBus && Array.isArray(this.eventBus.events)) {
      return this.eventBus.events.map((entry: { event: EventEnvelope }) => entry.event).slice(-40).reverse();
    }
    return [];
  }

  private async publish(type: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      CONCIERGE_STREAM,
      createEventEnvelope({
        type,
        source: "agent:business:002",
        data
      })
    );
  }
}

function conciergeSystemPrompt() {
  return [
    "You are WishLive Concierge Agent.",
    "Explain the live A2A workflow using only supplied events, sessions, negotiations, and contract status.",
    "Be concise, identify the current step, responsible agents, blockers, and next action.",
    "If data is missing, say what is missing instead of inventing facts."
  ].join(" ");
}

function buildPrompt(message: string, context: ConciergeContext) {
  return `User question: ${message}\n\nLive context JSON:\n${JSON.stringify(context).slice(0, 12000)}`;
}

function simulatedConcierge(message: string, context: ConciergeContext) {
  const latest = context.events[0];
  const negotiation = context.negotiations[0] as { status?: string; deal?: { status?: string } } | undefined;
  const session = context.sessions[0];
  return [
    `Concierge simulated answer for: ${message}`,
    latest ? `Latest event: ${latest.type} from ${latest.source}.` : "No Redis events are visible yet.",
    negotiation ? `Current negotiation status: ${negotiation.status ?? "unknown"}; deal: ${negotiation.deal?.status ?? "none"}.` : "No matching negotiation is in scope.",
    session ? `Latest agent session: ${session.agentId} used ${session.toolCalls.length} tools in ${session.mode} mode.` : "No agent runtime session is in scope.",
    "Next step: submit/aggregate wishes until threshold, review A2A negotiation, then human-confirm settlement."
  ].join("\n");
}
