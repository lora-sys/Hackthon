import {
  AcceptProposalRequestSchema,
  CounterProposalRequestSchema,
  CreateNegotiationRequestSchema,
  RejectProposalRequestSchema,
  SendProposalRequestSchema,
  type A2AMessage,
  type Deal,
  type Negotiation,
  type Proposal,
  type ProposalTerms
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { RegistryService } from "../registry";
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

  get(negotiationId: string) {
    const negotiation = this.negotiations.get(negotiationId);
    if (!negotiation) {
      throw new NegotiationError(404, `Negotiation not found: ${negotiationId}`);
    }
    return negotiation;
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
    const deal = this.getDeal(dealId);
    if (deal.status !== "PENDING_CONFIRMATION") {
      throw new NegotiationError(409, `Deal cannot be confirmed from ${deal.status}`);
    }

    const musician = this.registry.get(deal.musicianAgentId);
    const venue = this.registry.get(deal.venueAgentId);
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
    const deal = this.getDeal(dealId);
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

export class NegotiationError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "NegotiationError";
  }
}
