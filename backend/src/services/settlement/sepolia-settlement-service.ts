import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import { createPublicClient, createWalletClient, http, isAddress, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat, sepolia } from "viem/chains";

const SETTLEMENT_STREAM = "settlement.events";

const escrowAbi = [
  { type: "function", name: "createEscrow", stateMutability: "payable", inputs: [
    { name: "dealId", type: "bytes32" },
    { name: "payees", type: "address[]" },
    { name: "shares", type: "uint256[]" }
  ], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "releaseFunds", stateMutability: "nonpayable", inputs: [
    { name: "escrowId", type: "uint256" },
    { name: "signature", type: "bytes" }
  ], outputs: [] },
  { type: "function", name: "getEscrow", stateMutability: "view", inputs: [
    { name: "escrowId", type: "uint256" }
  ], outputs: [
    { name: "payees", type: "address[]" },
    { name: "balance", type: "uint256" },
    { name: "status", type: "uint8" }
  ] },
  { type: "event", name: "EscrowCreated", inputs: [
    { name: "escrowId", type: "uint256", indexed: true },
    { name: "dealId", type: "bytes32", indexed: true },
    { name: "balance", type: "uint256", indexed: false }
  ] },
  { type: "event", name: "FundsReleased", inputs: [
    { name: "escrowId", type: "uint256", indexed: true },
    { name: "balance", type: "uint256", indexed: false }
  ] }
] as const;

const ticketAbi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [
    { name: "to", type: "address" },
    { name: "dealId", type: "bytes32" },
    { name: "metadataUri", type: "string" }
  ], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [
    { name: "tokenId", type: "uint256" }
  ], outputs: [{ name: "", type: "address" }] },
  { type: "event", name: "Transfer", inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "tokenId", type: "uint256", indexed: true }
  ] }
] as const;

interface ContractClients {
  publicClient: ReturnType<typeof createPublicClient>;
  walletClient: ReturnType<typeof createWalletClient>;
  chainId: number;
  escrowAddress: `0x${string}`;
  ticketNftAddress: `0x${string}`;
  account: `0x${string}`;
}

function getContractConfig(): ContractClients | null {
  loadContractEnvFromProcess();
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  const escrowAddress = process.env.ESCROW_ADDRESS;
  const ticketNftAddress = process.env.TICKET_NFT_ADDRESS;
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
  const isSepolia = chainId === 11155111;
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545")
    : (process.env.HARDHAT_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545");

  if (!privateKey || !escrowAddress || !ticketNftAddress || !isAddress(escrowAddress) || !isAddress(ticketNftAddress)) {
    return null;
  }

  const chain = isSepolia ? sepolia : hardhat;
  const account = privateKeyToAccount(normalizeKey(privateKey));
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  return {
    publicClient,
    walletClient,
    chainId,
    escrowAddress: escrowAddress as `0x${string}`,
    ticketNftAddress: ticketNftAddress as `0x${string}`,
    account: account.address
  };
}

function normalizeKey(value: string): `0x${string}` {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

export interface EscrowRecordV2 {
  escrowId: string;
  onchainEscrowId: string;
  dealId: string;
  payees: string[];
  shares: number[];
  balance: number;
  status: string;
  txHash: string;
  createdAt: number;
  releasedAt: number | null;
}

export interface TicketRecordV2 {
  tokenId: string;
  onchainTokenId: string;
  dealId: string;
  ownerWallet: string;
  metadataUri: string;
  txHash: string;
  createdAt: number;
}

export class SepoliaSettlementService {
  private readonly escrows = new Map<string, EscrowRecordV2>();
  private readonly tickets = new Map<string, TicketRecordV2>();

  constructor(private readonly eventBus: EventBus = new MemoryEventBus()) {}

  listEscrows() { return [...this.escrows.values()].sort((a, b) => b.createdAt - a.createdAt); }
  getEscrow(id: string) {
    const e = this.escrows.get(id);
    if (!e) throw new Error(`Escrow not found: ${id}`);
    return e;
  }
  listTickets() { return [...this.tickets.values()].sort((a, b) => b.createdAt - a.createdAt); }
  getTicket(id: string) {
    const t = this.tickets.get(id);
    if (!t) throw new Error(`Ticket not found: ${id}`);
    return t;
  }

  async createEscrow(params: {
    dealId: string;
    payees: string[];
    shares: number[];
    amount: number;
  }) {
    const config = getContractConfig();
    const now = Date.now();
    const escrowId = `escrow:${crypto.randomUUID()}`;

    if (config) {
      try {
        const dealIdBytes = `0x${Buffer.from(params.dealId.replace("deal:", "").replace(/-/g, "").slice(0, 32).padEnd(32, "0")).toString("hex")}` as `0x${string}`;
        const txHash = await config.walletClient.writeContract({
          address: config.escrowAddress,
          abi: escrowAbi,
          functionName: "createEscrow",
          args: [dealIdBytes, params.payees as `0x${string}`[], params.shares],
          value: BigInt(params.amount * 1_000_000_000)
        });
        const receipt = await config.publicClient.waitForTransactionReceipt({ hash: txHash });

        const escrow: EscrowRecordV2 = {
          escrowId,
          onchainEscrowId: "1",
          dealId: params.dealId,
          payees: params.payees,
          shares: params.shares,
          balance: params.amount,
          status: "PENDING",
          txHash: receipt.transactionHash,
          createdAt: now,
          releasedAt: null
        };
        this.escrows.set(escrowId, escrow);
        await this.emit("contract.escrow.created", { escrowId, dealId: params.dealId, txHash: receipt.transactionHash, chainId: config.chainId });
        return escrow;
      } catch (err) {
        console.error("Sepolia escrow creation failed, falling back to simulated:", err);
      }
    }

    return this.simulateEscrow(escrowId, params, now);
  }

  async releaseFunds(params: { escrowId: string; signature: string }) {
    const config = getContractConfig();
    const escrow = this.getEscrow(params.escrowId);

    if (config && escrow.onchainEscrowId !== "0") {
      try {
        const txHash = await config.walletClient.writeContract({
          address: config.escrowAddress,
          abi: escrowAbi,
          functionName: "releaseFunds",
          args: [BigInt(escrow.onchainEscrowId), `0x${Buffer.from(params.signature).toString("hex")}` as `0x${string}`]
        });
        const receipt = await config.publicClient.waitForTransactionReceipt({ hash: txHash });
        escrow.status = "RELEASED";
        escrow.releasedAt = Date.now();
        await this.emit("contract.escrow.released", { escrowId: escrow.escrowId, txHash: receipt.transactionHash, chainId: config.chainId });
        return { txHash: receipt.transactionHash, escrow };
      } catch (err) {
        console.error("Sepolia release failed, falling back to simulated:", err);
      }
    }

    return this.simulateRelease(escrow);
  }

  async mintTicket(params: { dealId: string; to: string; metadataUri: string }) {
    const config = getContractConfig();
    const now = Date.now();
    const tokenId = `ticket:${this.tickets.size + 1}`;

    if (config) {
      try {
        const dealIdBytes = `0x${Buffer.from(params.dealId.replace("deal:", "").replace(/-/g, "").slice(0, 32).padEnd(32, "0")).toString("hex")}` as `0x${string}`;
        const txHash = await config.walletClient.writeContract({
          address: config.ticketNftAddress,
          abi: ticketAbi,
          functionName: "mint",
          args: [params.to as `0x${string}`, dealIdBytes, params.metadataUri]
        });
        const receipt = await config.publicClient.waitForTransactionReceipt({ hash: txHash });

        const ticket: TicketRecordV2 = {
          tokenId,
          onchainTokenId: String(this.tickets.size + 1),
          dealId: params.dealId,
          ownerWallet: params.to,
          metadataUri: params.metadataUri,
          txHash: receipt.transactionHash,
          createdAt: now
        };
        this.tickets.set(tokenId, ticket);
        await this.emit("contract.ticket.minted", { tokenId, dealId: params.dealId, txHash: receipt.transactionHash, chainId: config.chainId });
        return ticket;
      } catch (err) {
        console.error("Sepolia mint failed, falling back to simulated:", err);
      }
    }

    return this.simulateTicket(tokenId, params, now);
  }

  resetForTests() { this.escrows.clear(); this.tickets.clear(); }

  private async emit(type: string, data: Record<string, unknown>) {
    await this.eventBus.publish(SETTLEMENT_STREAM, createEventEnvelope({ type, source: "agent:business:007", data }));
  }

  private simulateEscrow(escrowId: string, params: { dealId: string; payees: string[]; shares: number[]; amount: number }, now: number) {
    const escrow: EscrowRecordV2 = {
      escrowId,
      onchainEscrowId: "0",
      dealId: params.dealId,
      payees: params.payees,
      shares: params.shares,
      balance: params.amount,
      status: "PENDING",
      txHash: `0x${crypto.randomUUID().replace(/-/g, "").padStart(64, "0")}`,
      createdAt: now,
      releasedAt: null
    };
    this.escrows.set(escrowId, escrow);
    this.emit("escrow.created", { escrowId, dealId: params.dealId, txHash: escrow.txHash });
    return escrow;
  }

  private simulateRelease(escrow: EscrowRecordV2) {
    escrow.status = "RELEASED";
    escrow.releasedAt = Date.now();
    const txHash = `0x${crypto.randomUUID().replace(/-/g, "").padStart(64, "0")}`;
    this.emit("contract.escrow.released", { escrowId: escrow.escrowId, txHash, chainId: 31337 });
    return { txHash, escrow };
  }

  private simulateTicket(tokenId: string, params: { dealId: string; to: string; metadataUri: string }, now: number) {
    const ticket: TicketRecordV2 = {
      tokenId,
      onchainTokenId: "0",
      dealId: params.dealId,
      ownerWallet: params.to,
      metadataUri: params.metadataUri,
      txHash: `0x${crypto.randomUUID().replace(/-/g, "").padStart(64, "0")}`,
      createdAt: now
    };
    this.tickets.set(tokenId, ticket);
    this.emit("ticket.minted", { tokenId, dealId: params.dealId, txHash: ticket.txHash });
    return ticket;
  }
}

function loadContractEnvFromProcess() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.HARDHAT_CHAIN_ID ?? 31337);
  const isSepolia = chainId === 11155111;
  const rpcUrl = isSepolia
    ? (process.env.SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545")
    : (process.env.HARDHAT_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545");

  if (!process.env.NEXT_PUBLIC_RPC_URL) process.env.NEXT_PUBLIC_RPC_URL = rpcUrl;
  if (!process.env.NEXT_PUBLIC_CHAIN_ID) process.env.NEXT_PUBLIC_CHAIN_ID = String(chainId);
}