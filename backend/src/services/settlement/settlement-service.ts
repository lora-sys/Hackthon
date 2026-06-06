import {
  CreateEscrowRequestSchema,
  MintTicketRequestSchema,
  ReleaseEscrowRequestSchema,
  type EscrowRecord,
  type TicketRecord
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { ContractService } from "../contracts";
import type { Address } from "viem";

const SETTLEMENT_STREAM = "settlement.events";

export class SettlementService {
  private readonly escrows = new Map<string, EscrowRecord>();
  private readonly tickets = new Map<string, TicketRecord>();

  constructor(
    private readonly eventBus: EventBus = new MemoryEventBus(),
    private readonly contracts?: ContractService
  ) {}

  listEscrows() {
    return [...this.escrows.values()].sort((left, right) => right.createdAt - left.createdAt);
  }

  getEscrow(escrowId: string) {
    const escrow = this.escrows.get(escrowId);
    if (!escrow) {
      throw new SettlementError(404, `Escrow not found: ${escrowId}`);
    }
    return escrow;
  }

  listTickets() {
    return [...this.tickets.values()].sort((left, right) => right.createdAt - left.createdAt);
  }

  async createEscrow(input: unknown, options: { confirmed: boolean; amount?: number }) {
    if (!options.confirmed) {
      throw new SettlementError(409, "Human confirmation required before escrow creation");
    }

    const request = CreateEscrowRequestSchema.parse(input);
    if (request.payees.length !== request.shares.length) {
      throw new SettlementError(400, "payees and shares length mismatch");
    }

    const onchain = this.contracts
      ? await this.contracts.createEscrow({
          dealId: request.dealId,
          payees: request.payees as Address[],
          shares: request.shares,
          amount: options.amount ?? 1_000
        })
      : null;
    const now = Date.now();
    const escrow: EscrowRecord = {
      escrowId: `escrow:${crypto.randomUUID()}`,
      dealId: request.dealId,
      payees: request.payees,
      shares: request.shares,
      balance: options.amount ?? 1_000,
      status: "PENDING",
      txHash: onchain?.txHash ?? localTxHash("escrow", request.dealId),
      contractAddress: onchain?.contractAddress ?? null,
      onchainEscrowId: onchain?.onchainEscrowId ?? null,
      createdAt: now,
      releasedAt: null
    };

    this.escrows.set(escrow.escrowId, escrow);
    await this.publish("escrow.created", "agent:business:007", {
      escrowId: escrow.escrowId,
      dealId: escrow.dealId,
      txHash: escrow.txHash,
      contractAddress: escrow.contractAddress,
      onchainEscrowId: escrow.onchainEscrowId,
      payees: escrow.payees,
      shares: escrow.shares,
      agentSkill: "create_escrow"
    });

    return escrow;
  }

  async releaseFunds(input: unknown, options: { dealConfirmed: boolean }) {
    const request = ReleaseEscrowRequestSchema.parse(input);
    const escrow = this.getEscrow(request.escrowId);
    if (!options.dealConfirmed) {
      throw new SettlementError(409, "Human confirmation required before release");
    }
    if (escrow.status !== "PENDING") {
      throw new SettlementError(409, `Escrow cannot be released from ${escrow.status}`);
    }

    escrow.status = "RELEASED";
    escrow.releasedAt = Date.now();
    this.escrows.set(escrow.escrowId, escrow);
    const onchain = this.contracts && escrow.onchainEscrowId
      ? await this.contracts.releaseEscrow({
          escrowId: escrow.escrowId,
          onchainEscrowId: escrow.onchainEscrowId,
          signature: request.signature
        })
      : null;
    return {
      txHash: onchain?.txHash ?? localTxHash("release", escrow.escrowId),
      escrow
    };
  }

  async mintTicket(input: unknown, options: { confirmed: boolean }) {
    if (!options.confirmed) {
      throw new SettlementError(409, "Human confirmation required before ticket mint");
    }

    const request = MintTicketRequestSchema.parse(input);
    const metadataUri = `ipfs://wishlive/${encodeURIComponent(request.dealId)}`;
    const onchain = this.contracts
      ? await this.contracts.mintTicket({
          dealId: request.dealId,
          to: request.to as Address,
          metadataUri
        })
      : null;
    const now = Date.now();
    const ticket: TicketRecord = {
      tokenId: onchain?.tokenId ? `ticket:${onchain.tokenId}` : `ticket:${this.tickets.size + 1}`,
      dealId: request.dealId,
      ownerWallet: request.to,
      metadataUri,
      txHash: onchain?.txHash ?? localTxHash("ticket", request.dealId),
      contractAddress: onchain?.contractAddress ?? null,
      createdAt: now
    };

    this.tickets.set(ticket.tokenId, ticket);
    await this.publish("ticket.minted", "agent:business:007", {
      tokenId: ticket.tokenId,
      dealId: ticket.dealId,
      ownerWallet: ticket.ownerWallet,
      metadataUri: ticket.metadataUri,
      txHash: ticket.txHash,
      contractAddress: ticket.contractAddress,
      agentSkill: "mint_ticket"
    });

    return ticket;
  }

  resetForTests() {
    this.escrows.clear();
    this.tickets.clear();
  }

  private async publish(type: string, source: string, data: Record<string, unknown>) {
    await this.eventBus.publish(
      SETTLEMENT_STREAM,
      createEventEnvelope({
        type,
        source,
        data
      })
    );
  }
}

export class SettlementError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "SettlementError";
  }
}

function localTxHash(prefix: string, seed: string) {
  const input = `${prefix}:${seed}:${Date.now()}:${crypto.randomUUID()}`;
  const bytes = new TextEncoder().encode(input);
  let hash = 0;
  for (const byte of bytes) {
    hash = (hash * 31 + byte) >>> 0;
  }
  return `0x${hash.toString(16).padStart(64, "0")}`;
}
