import {
  AcceptProposalRequestSchema,
  CounterProposalRequestSchema,
  CreateNegotiationRequestSchema,
  DealSchema,
  RejectProposalRequestSchema,
  SendProposalRequestSchema,
  NegotiationSchema,
  ProposalTermsSchema,
  type A2AMessage,
  type AgentCard,
  type Deal,
  type Demand,
  type Negotiation,
  type Proposal,
  type ProposalTerms
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { RegistryService } from "../registry";
import { createSeedAgentCards } from "../registry/seeds";
import { AgentRuntimeService } from "../runtime";
import type { SettlementService } from "../settlement";

const AGENT_TASK_STREAM = "agent.task";
const NEGOTIATION_STREAM = "negotiation.events";
const SHOW_STREAM = "show.events";

export class NegotiationService {
  private readonly negotiations = new Map<string, Negotiation>();
  private readonly deals = new Map<string, Deal>();

  constructor(
    private readonly registry: RegistryService,
    private readonly settlement: SettlementService,
    private readonly eventBus: EventBus = new MemoryEventBus()
  ) {}

  async createNegotiation(input: unknown) {
    const request = CreateNegotiationRequestSchema.parse(input);
    await this.registry.ensureSeeded();
    this.registry.get(request.musicianId);
    this.registry.get(request.venueId);

    const now = Date.now();
    const negotiationId = `negotiation:${crypto.randomUUID()}`;
    const negotiation: Negotiation = {
      negotiationId,
      demandId: request.demandId,
      musicianId: request.musicianId,
      venueId: request.venueId,
      workflowId: `workflow:${crypto.randomUUID()}`,
      conversationId: `conv:${request.musicianId}->${request.venueId}`,
      status: "ACTIVE",
      proposals: [],
      deal: null,
      createdAt: now,
      updatedAt: now
    };

    this.negotiations.set(negotiation.negotiationId, negotiation);
    await this.publishNegotiation("negotiation.started", "agent:business:006", {
      negotiationId: negotiation.negotiationId,
      demandId: negotiation.demandId,
      musicianId: negotiation.musicianId,
      venueId: negotiation.venueId,
      agentSkill: "create_negotiation"
    });

    return negotiation;
  }

  async runAutonomousNegotiation(demand: Demand) {
    if (!demand.matching?.musicians.length || !demand.matching.venues.length) {
      throw new NegotiationError(400, "Matching candidates are required before autonomous negotiation");
    }

    const existing = this.findByDemandId(demand.demandId);
    if (existing) {
      return existing;
    }

    const musicianId = demand.matching.musicians[0]?.agentId;
    const venueId = demand.matching.venues[0]?.agentId;
    if (!musicianId || !venueId) {
      throw new NegotiationError(400, "Top musician and venue candidates are required");
    }

    const musician = this.registry.get(musicianId);
    const venue = this.registry.get(venueId);
    const negotiation = await this.createNegotiation({
      demandId: demand.demandId,
      musicianId,
      venueId
    });

    const initialTerms = buildProposalTerms({
      demand,
      musician,
      venue,
      splitSource: musician
    });
    const initial = await this.sendProposal(negotiation.negotiationId, {
      from: musicianId,
      to: venueId,
      terms: initialTerms
    });

    const counterTerms = buildProposalTerms({
      demand,
      musician,
      venue,
      splitSource: venue
    });
    const counter = await this.counterProposal(negotiation.negotiationId, {
      proposalId: initial.proposalId,
      from: venueId,
      newTerms: counterTerms
    });

    await this.acceptProposal(negotiation.negotiationId, {
      proposalId: counter.proposalId,
      from: musicianId
    });

    return this.get(negotiation.negotiationId);
  }

  list(input: { agentId?: string; status?: Negotiation["status"] } = {}) {
    return [...this.negotiations.values()]
      .filter(
        (negotiation) =>
          !input.agentId ||
          negotiation.musicianId === input.agentId ||
          negotiation.venueId === input.agentId
      )
      .filter((negotiation) => !input.status || negotiation.status === input.status)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  }

  findByDemandId(demandId: string) {
    return [...this.negotiations.values()]
      .filter((negotiation) => negotiation.demandId === demandId)
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  }

  get(negotiationId: string) {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      throw new NegotiationError(404, `Negotiation not found: ${negotiationId}`);
    }
    return negotiation;
  }

  async getOrRecover(negotiationId: string) {
    return this.negotiations.get(negotiationId) ?? (await this.recoverNegotiation(negotiationId));
  }

  listDeals(input: { status?: Deal["status"] } = {}) {
    return [...this.deals.values()]
      .filter((deal) => !input.status || deal.status === input.status)
      .sort((left, right) => right.createdAt - left.createdAt);
  }

  getDeal(dealId: string) {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw new NegotiationError(404, `Deal not found: ${dealId}`);
    }
    return deal;
  }

  async getDealOrRecover(dealId: string) {
    return this.deals.get(dealId) ?? (await this.recoverDeal(dealId));
  }

  async sendProposal(negotiationId: string, input: unknown) {
    const request = SendProposalRequestSchema.parse(input);
    const negotiation = this.get(negotiationId);
    this.assertParticipant(negotiation, request.from);
    this.assertParticipant(negotiation, request.to);
    const proposal = await this.createProposal(negotiation, {
      from: request.from,
      to: request.to,
      terms: request.terms,
      type: "INITIAL",
      eventType: "proposal.sent",
      messageType: "PROPOSAL"
    });
    return { proposalId: proposal.proposalId };
  }

  async counterProposal(negotiationId: string, input: unknown) {
    const request = CounterProposalRequestSchema.parse(input);
    const negotiation = this.get(negotiationId);
    const previous = this.findProposal(negotiation, request.proposalId);
    this.assertParticipant(negotiation, request.from);
    const proposal = await this.createProposal(negotiation, {
      from: request.from,
      to: previous.senderAgentId,
      terms: request.newTerms,
      type: "COUNTER",
      eventType: "proposal.countered",
      messageType: "COUNTER_PROPOSAL"
    });
    return { proposalId: proposal.proposalId };
  }

  async acceptProposal(negotiationId: string, input: unknown) {
    const request = AcceptProposalRequestSchema.parse(input);
    const negotiation = this.get(negotiationId);
    const proposal = this.findProposal(negotiation, request.proposalId);
    this.assertParticipant(negotiation, request.from);
    proposal.decision = "ACCEPTED";
    const runtime = new AgentRuntimeService(this.registry, this.eventBus);
    await runtime.run({
      agentId: request.from,
      workflowId: negotiation.workflowId,
      conversationId: negotiation.conversationId,
      userMessage: `Accept proposal ${proposal.proposalId} from ${proposal.senderAgentId}`,
      tools: [
        {
          name: "accept_offer",
          input: {
            from: request.from,
            proposalId: proposal.proposalId
          }
        },
        {
          name: "update_reputation",
          input: {
            agentId: request.from,
            delta: 1,
            reason: "accepted negotiated offer"
          }
        }
      ],
      metadata: {
        negotiationId,
        proposalId: proposal.proposalId
      }
    });

    const now = Date.now();
    const deal: Deal = {
      dealId: `deal:${crypto.randomUUID()}`,
      negotiationId: negotiation.negotiationId,
      proposalId: proposal.proposalId,
      demandId: negotiation.demandId,
      musicianAgentId: negotiation.musicianId,
      venueAgentId: negotiation.venueId,
      terms: proposal.terms,
      status: "PENDING_CONFIRMATION",
      escrowId: null,
      ticketId: null,
      createdAt: now,
      confirmedAt: null
    };

    negotiation.status = "DEAL_CREATED";
    negotiation.deal = deal;
    negotiation.updatedAt = now;
    this.deals.set(deal.dealId, deal);
    this.negotiations.set(negotiation.negotiationId, negotiation);

    await this.publishA2A(negotiation, {
      sender: request.from,
      receiver: proposal.senderAgentId,
      type: "ACCEPT",
      payload: { proposalId: proposal.proposalId, acceptedBy: request.from }
    });
    await this.publishNegotiation("proposal.accepted", "agent:business:006", {
      negotiationId: negotiation.negotiationId,
      proposalId: proposal.proposalId,
      acceptedBy: request.from,
      agentSkill: "route_proposal"
    });
    await this.publishNegotiation("deal.created", "agent:business:006", {
      dealId: deal.dealId,
      negotiationId: negotiation.negotiationId,
      proposalId: proposal.proposalId,
      status: deal.status,
      agentSkill: "create_deal"
    });

    return { status: negotiation.status, deal };
  }

  async rejectProposal(negotiationId: string, input: unknown) {
    const request = RejectProposalRequestSchema.parse(input);
    const negotiation = this.get(negotiationId);
    const proposal = this.findProposal(negotiation, request.proposalId);
    this.assertParticipant(negotiation, request.from);
    proposal.decision = "REJECTED";
    negotiation.status = "REJECTED";
    negotiation.updatedAt = Date.now();
    this.negotiations.set(negotiation.negotiationId, negotiation);

    await this.publishA2A(negotiation, {
      sender: request.from,
      receiver: proposal.senderAgentId,
      type: "REJECT",
      payload: { proposalId: proposal.proposalId, reason: request.reason ?? "rejected" }
    });
    await this.publishNegotiation("proposal.rejected", "agent:business:006", {
      negotiationId: negotiation.negotiationId,
      proposalId: proposal.proposalId,
      rejectedBy: request.from,
      reason: request.reason ?? "rejected",
      agentSkill: "route_proposal"
    });

    return { status: negotiation.status };
  }

  async confirmDeal(dealId: string, signature: string) {
    const deal = this.deals.get(dealId) ?? (await this.recoverDeal(dealId));
    if (deal.status !== "PENDING_CONFIRMATION") {
      throw new NegotiationError(409, `Deal cannot be confirmed from ${deal.status}`);
    }

    await this.registry.ensureSeeded();
    const musician = await this.resolveParticipantCard(deal.musicianAgentId);
    const venue = await this.resolveParticipantCard(deal.venueAgentId);
    const now = Date.now();
    deal.status = "CONFIRMED";
    deal.confirmedAt = now;
    this.deals.set(deal.dealId, deal);
    this.syncDeal(deal);

    await this.publishShow("show.confirmed", "agent:business:008", {
      dealId: deal.dealId,
      signature,
      agentSkill: "confirm_show"
    });

    const escrow = await this.settlement.createEscrow(
      {
        dealId: deal.dealId,
        payees: [musician.wallet, venue.wallet],
        shares: [100 - deal.terms.splitPercentage, deal.terms.splitPercentage]
      },
      { confirmed: true, amount: deal.terms.venueFee }
    );
    const release = await this.settlement.releaseFunds(
      { escrowId: escrow.escrowId, signature },
      { dealConfirmed: true }
    );
    const ticket = await this.settlement.mintTicket(
      {
        dealId: deal.dealId,
        to: musician.wallet
      },
      { confirmed: true }
    );

    deal.status = "SETTLED";
    deal.escrowId = escrow.escrowId;
    deal.ticketId = ticket.tokenId;
    this.deals.set(deal.dealId, deal);
    this.syncDeal(deal);

    return {
      status: deal.status,
      deal,
      escrow,
      releaseTxHash: release.txHash,
      ticket
    };
  }

  async rejectDeal(dealId: string, reason = "human rejected") {
    const deal = this.deals.get(dealId) ?? (await this.recoverDeal(dealId));
    if (deal.status !== "PENDING_CONFIRMATION") {
      throw new NegotiationError(409, `Deal cannot be rejected from ${deal.status}`);
    }
    deal.status = "REJECTED";
    this.deals.set(deal.dealId, deal);
    this.syncDeal(deal);
    await this.publishShow("show.rejected", "agent:business:008", {
      dealId,
      reason,
      agentSkill: "confirm_show"
    });
    return { status: deal.status };
  }

  resetForTests() {
    this.negotiations.clear();
    this.deals.clear();
  }

  private async createProposal(
    negotiation: Negotiation,
    input: {
      from: string;
      to: string;
      terms: ProposalTerms;
      type: Proposal["type"];
      eventType: string;
      messageType: A2AMessage["type"];
    }
  ) {
    const proposal: Proposal = {
      proposalId: `proposal:${crypto.randomUUID()}`,
      negotiationId: negotiation.negotiationId,
      senderAgentId: input.from,
      receiverAgentId: input.to,
      type: input.type,
      terms: input.terms,
      decision: "PENDING",
      payload: {},
      createdAt: Date.now()
    };

    negotiation.proposals.push(proposal);
    negotiation.status = "ACTIVE";
    negotiation.updatedAt = proposal.createdAt;
    this.negotiations.set(negotiation.negotiationId, negotiation);
    const runtime = new AgentRuntimeService(this.registry, this.eventBus);
    await runtime.run({
      agentId: input.from,
      workflowId: negotiation.workflowId,
      conversationId: negotiation.conversationId,
      userMessage: `${input.from} sends ${input.messageType} to ${input.to}`,
      tools: runtimeToolsForProposal(input),
      metadata: {
        negotiationId: negotiation.negotiationId,
        proposalId: proposal.proposalId,
        messageType: input.messageType
      }
    });

    await this.publishA2A(negotiation, {
      sender: input.from,
      receiver: input.to,
      type: input.messageType,
      payload: {
        proposalId: proposal.proposalId,
        terms: proposal.terms
      }
    });
    await this.publishNegotiation(input.eventType, "agent:business:006", {
      negotiationId: negotiation.negotiationId,
      proposalId: proposal.proposalId,
      from: input.from,
      to: input.to,
      terms: proposal.terms,
      agentSkill: "route_proposal"
    });

    return proposal;
  }

  private findProposal(negotiation: Negotiation, proposalId: string) {
    const proposal = negotiation.proposals.find((entry) => entry.proposalId === proposalId);
    if (!proposal) {
      throw new NegotiationError(404, `Proposal not found: ${proposalId}`);
    }
    return proposal;
  }

  private assertParticipant(negotiation: Negotiation, agentId: string) {
    if (agentId !== negotiation.musicianId && agentId !== negotiation.venueId) {
      throw new NegotiationError(403, `${agentId} is not part of this negotiation`);
    }
  }

  private syncDeal(deal: Deal) {
    const negotiation = this.get(deal.negotiationId);
    negotiation.deal = deal;
    negotiation.updatedAt = Date.now();
    this.negotiations.set(negotiation.negotiationId, negotiation);
  }

  private async resolveParticipantCard(agentId: string) {
    try {
      return this.registry.get(agentId);
    } catch (error) {
      const seedCard = createSeedAgentCards().find((card) => card.agent_id === agentId);
      if (!seedCard) {
        throw error;
      }
      await this.registry.register(seedCard);
      await this.registry.heartbeat(seedCard.agent_id);
      return this.registry.get(agentId);
    }
  }

  private async recoverDeal(dealId: string) {
    const negotiation = await this.recoverNegotiationByDealId(dealId);
    const deal = negotiation.deal;
    if (!deal || deal.dealId !== dealId) {
      throw new NegotiationError(404, `Deal not found: ${dealId}`);
    }
    return deal;
  }

  private async recoverNegotiationByDealId(dealId: string) {
    const entries = await this.readRecentStateEvents();
    const dealEvent = entries.find(
      (entry) => entry.event.type === "deal.created" && entry.event.data.dealId === dealId
    );
    const negotiationId = stringValue(dealEvent?.event.data.negotiationId);
    if (!negotiationId) {
      throw new NegotiationError(404, `Deal not found: ${dealId}`);
    }
    return this.recoverNegotiation(negotiationId, entries);
  }

  private async recoverNegotiation(
    negotiationId: string,
    prefetched?: Array<{ stream: string; event: { type: string; timestamp: number; data: Record<string, unknown> } }>
  ) {
    const entries = (prefetched ?? (await this.readRecentStateEvents()))
      .filter(
        (entry) =>
          entry.event.data.negotiationId === negotiationId ||
          entry.event.data.targetAgentId === negotiationId
      )
      .sort((left, right) => left.event.timestamp - right.event.timestamp);
    const started = entries.find((entry) => entry.event.type === "negotiation.started");
    if (!started) {
      throw new NegotiationError(404, `Negotiation not found: ${negotiationId}`);
    }

    const demandId = requiredString(started.event.data.demandId, "demandId");
    const musicianId = requiredString(started.event.data.musicianId, "musicianId");
    const venueId = requiredString(started.event.data.venueId, "venueId");
    const proposals: Proposal[] = [];
    let deal: Deal | null = null;

    for (const entry of entries) {
      if (entry.event.type === "proposal.sent" || entry.event.type === "proposal.countered") {
        const terms = ProposalTermsSchema.parse(entry.event.data.terms);
        const proposal = {
          proposalId: requiredString(entry.event.data.proposalId, "proposalId"),
          negotiationId,
          senderAgentId: requiredString(entry.event.data.from, "from"),
          receiverAgentId: requiredString(entry.event.data.to, "to"),
          type: entry.event.type === "proposal.sent" ? "INITIAL" : "COUNTER",
          terms,
          decision: "PENDING",
          payload: {},
          createdAt: entry.event.timestamp
        } satisfies Proposal;
        proposals.push(proposal);
      }

      if (entry.event.type === "proposal.accepted") {
        const proposalId = requiredString(entry.event.data.proposalId, "proposalId");
        const proposal = proposals.find((candidate) => candidate.proposalId === proposalId);
        if (proposal) {
          proposal.decision = "ACCEPTED";
        }
      }

      if (entry.event.type === "deal.created") {
        const proposalId = requiredString(entry.event.data.proposalId, "proposalId");
        const proposal = proposals.find((candidate) => candidate.proposalId === proposalId);
        if (proposal) {
          deal = DealSchema.parse({
            dealId: requiredString(entry.event.data.dealId, "dealId"),
            negotiationId,
            proposalId,
            demandId,
            musicianAgentId: musicianId,
            venueAgentId: venueId,
            terms: proposal.terms,
            status: entry.event.data.status ?? "PENDING_CONFIRMATION",
            escrowId: null,
            ticketId: null,
            createdAt: entry.event.timestamp,
            confirmedAt: null
          });
        }
      }

      if (deal && entry.event.type === "show.confirmed" && entry.event.data.dealId === deal.dealId) {
        deal.status = "CONFIRMED";
        deal.confirmedAt = entry.event.timestamp;
      }

      if (deal && entry.event.type === "escrow.created" && entry.event.data.dealId === deal.dealId) {
        deal.escrowId = stringValue(entry.event.data.escrowId) ?? deal.escrowId;
      }

      if (deal && entry.event.type === "ticket.minted" && entry.event.data.dealId === deal.dealId) {
        deal.ticketId = stringValue(entry.event.data.ticketId) ?? stringValue(entry.event.data.tokenId) ?? deal.ticketId;
        deal.status = "SETTLED";
      }
    }

    const updatedAt = entries.at(-1)?.event.timestamp ?? started.event.timestamp;
    const negotiation = NegotiationSchema.parse({
      negotiationId,
      demandId,
      musicianId,
      venueId,
      workflowId: `workflow:${demandId}`,
      conversationId: `conv:${musicianId}->${venueId}`,
      status: deal ? "DEAL_CREATED" : "ACTIVE",
      proposals,
      deal,
      createdAt: started.event.timestamp,
      updatedAt
    });
    this.negotiations.set(negotiation.negotiationId, negotiation);
    if (deal) {
      this.deals.set(deal.dealId, deal);
    }
    return negotiation;
  }

  private async readRecentStateEvents() {
    if (!("readRecent" in this.eventBus) || typeof this.eventBus.readRecent !== "function") {
      return [];
    }
    return (await this.eventBus.readRecent(
      ["negotiation.events", "show.events", "settlement.events"],
      300
    )) as Array<{ stream: string; event: { type: string; timestamp: number; data: Record<string, unknown> } }>;
  }

  private async publishA2A(
    negotiation: Negotiation,
    input: Pick<A2AMessage, "sender" | "receiver" | "type" | "payload">
  ) {
    const message: A2AMessage = {
      id: `msg:${crypto.randomUUID()}`,
      workflowId: negotiation.workflowId,
      conversationId: negotiation.conversationId,
      sender: input.sender,
      receiver: input.receiver,
      type: input.type,
      payload: input.payload,
      timestamp: new Date().toISOString()
    };

    await this.eventBus.publish(
      AGENT_TASK_STREAM,
      createEventEnvelope({
        type: `a2a.${input.type.toLowerCase()}`,
        source: input.sender,
        data: {
          targetAgentId: input.receiver,
          message
        }
      })
    );
  }

  private async publishNegotiation(type: string, source: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      NEGOTIATION_STREAM,
      createEventEnvelope({
        type,
        source,
        data
      })
    );
  }

  private async publishShow(type: string, source: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      SHOW_STREAM,
      createEventEnvelope({
        type,
        source,
        data
      })
    );
  }
}

function runtimeToolsForProposal(input: {
  from: string;
  to: string;
  terms: ProposalTerms;
  messageType: A2AMessage["type"];
}) {
  if (input.messageType === "COUNTER_PROPOSAL") {
    return [
      {
        name: "quote_price" as const,
        input: {
          agentId: input.from
        }
      },
      {
        name: "counter_offer" as const,
        input: {
          from: input.from,
          to: input.to,
          venueFee: input.terms.venueFee,
          splitPercentage: input.terms.splitPercentage
        }
      }
    ];
  }

  return [
    {
      name: "check_availability" as const,
      input: {
        agentId: input.from,
        date: input.terms.schedule.date
      }
    },
    {
      name: "propose_offer" as const,
      input: {
        from: input.from,
        to: input.to,
        venueFee: input.terms.venueFee,
        splitPercentage: input.terms.splitPercentage
      }
    }
  ];
}

function buildProposalTerms(input: {
  demand: Demand;
  musician: AgentCard;
  venue: AgentCard;
  splitSource: AgentCard;
}): ProposalTerms {
  const venueFee = numericMetadata(input.venue, "baseFee", 0);
  const splitPercentage = numericMetadata(input.splitSource, "splitPreference", 25);

  return {
    venueFee,
    splitPercentage,
    schedule: {
      date: input.demand.preferredDate,
      startTime: stringMetadata(input.venue, "preferredStartTime", "19:00"),
      endTime: stringMetadata(input.venue, "preferredEndTime", "22:00")
    }
  };
}

function numericMetadata(card: AgentCard, key: string, fallback: number) {
  const value = card.metadata[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function stringMetadata(card: AgentCard, key: string, fallback: string) {
  const value = card.metadata[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requiredString(value: unknown, key: string) {
  const next = stringValue(value);
  if (!next) {
    throw new NegotiationError(422, `Cannot recover negotiation without ${key}`);
  }
  return next;
}

export class NegotiationError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "NegotiationError";
  }
}
