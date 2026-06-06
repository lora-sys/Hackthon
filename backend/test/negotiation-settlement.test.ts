import { describe, expect, it } from "vitest";
import { MemoryEventBus, NegotiationService, RegistryService, SettlementService } from "../src";

const terms = {
  venueFee: 5_000,
  splitPercentage: 25,
  schedule: {
    date: "2026-07-17",
    startTime: "19:00",
    endTime: "22:00"
  }
};

describe("negotiation and settlement workflow", () => {
  it("creates an A2A negotiation event chain and blocks settlement until confirmation", async () => {
    const eventBus = new MemoryEventBus();
    const registry = new RegistryService(eventBus);
    const settlement = new SettlementService(eventBus);
    const negotiationService = new NegotiationService(registry, settlement, eventBus);

    const negotiation = await negotiationService.createNegotiation({
      demandId: "demand:test",
      musicianId: "agent:musician:001",
      venueId: "agent:venue:007"
    });

    const proposal = await negotiationService.sendProposal(negotiation.negotiationId, {
      from: "agent:musician:001",
      to: "agent:venue:007",
      terms
    });
    const counter = await negotiationService.counterProposal(negotiation.negotiationId, {
      proposalId: proposal.proposalId,
      from: "agent:venue:007",
      newTerms: {
        ...terms,
        venueFee: 4_000,
        splitPercentage: 22
      }
    });
    const accepted = await negotiationService.acceptProposal(negotiation.negotiationId, {
      proposalId: counter.proposalId,
      from: "agent:musician:001"
    });

    expect(accepted.status).toBe("DEAL_CREATED");
    expect(accepted.deal.status).toBe("PENDING_CONFIRMATION");
    expect(eventBus.byType("a2a.proposal")).toHaveLength(1);
    expect(eventBus.byType("a2a.counter_proposal")).toHaveLength(1);
    expect(eventBus.byType("a2a.accept")).toHaveLength(1);
    expect(eventBus.byType("deal.created")).toHaveLength(1);
    expect(eventBus.byType("agent.tool_call").length).toBeGreaterThanOrEqual(6);
    expect(eventBus.byType("agent.tool_result").length).toBeGreaterThanOrEqual(6);
    expect(eventBus.byType("agent.message").length).toBeGreaterThanOrEqual(3);

    await expect(
      settlement.createEscrow(
        {
          dealId: accepted.deal.dealId,
          payees: ["0x0000000000000000000000000000000000000001"],
          shares: [100]
        },
        { confirmed: false }
      )
    ).rejects.toThrow("Human confirmation required");

    const confirmed = await negotiationService.confirmDeal(
      accepted.deal.dealId,
      "browser-human-confirmation"
    );

    expect(confirmed.status).toBe("SETTLED");
    expect(confirmed.deal.escrowId).toMatch(/^escrow:/);
    expect(confirmed.deal.ticketId).toMatch(/^ticket:/);
    expect(eventBus.byType("show.confirmed")).toHaveLength(1);
    expect(eventBus.byType("escrow.created")).toHaveLength(1);
    expect(eventBus.byType("ticket.minted")).toHaveLength(1);
  });
});
