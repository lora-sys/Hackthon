import type { AgentCard, ContractStatus, ContractTxRecord } from "@wishlive/shared";
import { RegisterAgentOnchainRequestSchema } from "@wishlive/shared";
import { createHash } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEther,
  stringToHex,
  type Address,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import AgentProfileArtifact from "../../../../contracts/artifacts/contracts/AgentProfile.sol/AgentProfile.json" assert { type: "json" };
import EscrowArtifact from "../../../../contracts/artifacts/contracts/Escrow.sol/Escrow.json" assert { type: "json" };
import TicketNFTArtifact from "../../../../contracts/artifacts/contracts/TicketNFT.sol/TicketNFT.json" assert { type: "json" };
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";

const CONTRACT_STREAM = "contract.events";
const DEFAULT_RPC = "http://127.0.0.1:8545";
const HARDHAT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

type ContractName = "AgentProfile" | "Escrow" | "TicketNFT";

type ContractAddresses = Record<ContractName, Address | null>;

export class ContractService {
  private addresses: ContractAddresses = {
    AgentProfile: null,
    Escrow: null,
    TicketNFT: null
  };
  private txs: ContractTxRecord[] = [];
  private error: string | null = null;
  private deployed = false;
  private nextEscrowId = 1;
  private nextTicketId = 1;
  private nextAgentProfileId = 1;

  constructor(private readonly eventBus: EventBus = new MemoryEventBus()) {}

  async status(): Promise<ContractStatus> {
    const chainId = await this.readChainId();
    return {
      chainId,
      rpcUrl: rpcUrl(),
      healthy: chainId === 31337 && !this.error,
      mode: chainId === 31337 ? "localnet" : "simulated",
      addresses: this.addresses,
      latestTx: this.txs[0] ?? null,
      txs: this.txs.slice(0, 20),
      error: this.error
    };
  }

  async ensureDeployed() {
    if (this.deployed && this.addresses.AgentProfile && this.addresses.Escrow && this.addresses.TicketNFT) {
      return this.addresses;
    }

    try {
      const chainId = await this.readChainId();
      if (chainId !== 31337) {
        throw new Error(`Hardhat localnet expected chainId 31337, got ${chainId}`);
      }

      this.addresses.AgentProfile = await this.deploy("AgentProfile", AgentProfileArtifact.bytecode as Hex);
      this.addresses.Escrow = await this.deploy("Escrow", EscrowArtifact.bytecode as Hex);
      this.addresses.TicketNFT = await this.deploy("TicketNFT", TicketNFTArtifact.bytecode as Hex);
      this.deployed = true;
      this.error = null;
      return this.addresses;
    } catch (error) {
      this.error = error instanceof Error ? error.message : "contract deployment failed";
      throw error;
    }
  }

  async registerAgent(input: unknown) {
    const request = RegisterAgentOnchainRequestSchema.parse(input);
    await this.ensureDeployed();
    const agentProfile = this.requireAddress("AgentProfile");
    const cardHash = hashAgentCard(request.agentCard);
    const txHash = await this.wallet().writeContract({
      address: agentProfile,
      abi: AgentProfileArtifact.abi,
      functionName: "registerAgent",
      args: [request.wallet, cardHash, request.did]
    });
    await this.publicClient().waitForTransactionReceipt({ hash: txHash });
    const onchainAgentId = String(this.nextAgentProfileId);
    this.nextAgentProfileId += 1;
    await this.recordTx("contract.agent_profile.registered", "AgentProfile", txHash, {
      agentId: request.agentId,
      onchainAgentId,
      wallet: request.wallet,
      did: request.did,
      cardHash
    });
    return {
      agentId: request.agentId,
      onchainAgentId,
      txHash,
      contractAddress: agentProfile,
      cardHash
    };
  }

  async registerAgentCard(card: AgentCard) {
    return this.registerAgent({
      agentId: card.agent_id,
      did: card.did,
      wallet: card.wallet,
      agentCard: card
    });
  }

  async createEscrow(input: { dealId: string; payees: Address[]; shares: number[]; amount: number }) {
    await this.ensureDeployed();
    const escrow = this.requireAddress("Escrow");
    const txHash = await this.wallet().writeContract({
      address: escrow,
      abi: EscrowArtifact.abi,
      functionName: "createEscrow",
      args: [dealHash(input.dealId), input.payees, input.shares.map(BigInt)],
      value: parseEther(String(Math.max(input.amount, 1) / 1000))
    });
    await this.publicClient().waitForTransactionReceipt({ hash: txHash });
    const onchainEscrowId = String(this.nextEscrowId);
    this.nextEscrowId += 1;
    await this.recordTx("contract.escrow.created", "Escrow", txHash, {
      dealId: input.dealId,
      onchainEscrowId,
      payees: input.payees,
      shares: input.shares
    });
    return { txHash, contractAddress: escrow, onchainEscrowId };
  }

  async releaseEscrow(input: { escrowId: string; onchainEscrowId: string; signature: string }) {
    await this.ensureDeployed();
    const escrow = this.requireAddress("Escrow");
    const txHash = await this.wallet().writeContract({
      address: escrow,
      abi: EscrowArtifact.abi,
      functionName: "releaseFunds",
      args: [BigInt(input.onchainEscrowId), stringToHex(input.signature)]
    });
    await this.publicClient().waitForTransactionReceipt({ hash: txHash });
    await this.recordTx("contract.escrow.released", "Escrow", txHash, {
      escrowId: input.escrowId,
      onchainEscrowId: input.onchainEscrowId
    });
    return { txHash, contractAddress: escrow };
  }

  async mintTicket(input: { dealId: string; to: Address; metadataUri: string }) {
    await this.ensureDeployed();
    const ticket = this.requireAddress("TicketNFT");
    const txHash = await this.wallet().writeContract({
      address: ticket,
      abi: TicketNFTArtifact.abi,
      functionName: "mint",
      args: [input.to, dealHash(input.dealId), input.metadataUri]
    });
    await this.publicClient().waitForTransactionReceipt({ hash: txHash });
    const tokenId = String(this.nextTicketId);
    this.nextTicketId += 1;
    await this.recordTx("contract.ticket.minted", "TicketNFT", txHash, {
      dealId: input.dealId,
      tokenId,
      ownerWallet: input.to,
      metadataUri: input.metadataUri
    });
    return { txHash, contractAddress: ticket, tokenId };
  }

  private publicClient() {
    return createPublicClient({
      chain: hardhat,
      transport: http(rpcUrl())
    });
  }

  private wallet() {
    return createWalletClient({
      account: privateKeyToAccount((process.env.HARDHAT_DEPLOYER_PRIVATE_KEY ?? HARDHAT_PRIVATE_KEY) as Hex),
      chain: hardhat,
      transport: http(rpcUrl())
    });
  }

  private async readChainId() {
    try {
      return await this.publicClient().getChainId();
    } catch (error) {
      this.error = error instanceof Error ? error.message : "Hardhat localnet unavailable";
      return 0;
    }
  }

  private async deploy(contractName: ContractName, bytecode: Hex) {
    const txHash = await this.wallet().deployContract({
      abi: contractName === "AgentProfile" ? AgentProfileArtifact.abi : contractName === "Escrow" ? EscrowArtifact.abi : TicketNFTArtifact.abi,
      bytecode
    });
    const receipt = await this.publicClient().waitForTransactionReceipt({ hash: txHash });
    if (!receipt.contractAddress) {
      throw new Error(`${contractName} deployment did not return contract address`);
    }
    const tx: ContractTxRecord = {
      type: `contract.${contractName.toLowerCase()}.deployed`,
      hash: txHash,
      contractName,
      contractAddress: receipt.contractAddress,
      createdAt: Date.now(),
      metadata: {}
    };
    this.txs.unshift(tx);
    await this.eventBus.publish(
      CONTRACT_STREAM,
      createEventEnvelope({
        type: tx.type,
        source: "agent:infrastructure:hardhat",
        data: tx
      })
    );
    return receipt.contractAddress;
  }

  private requireAddress(contractName: ContractName) {
    const address = this.addresses[contractName];
    if (!address) {
      throw new Error(`${contractName} not deployed`);
    }
    return address;
  }

  private async recordTx(type: string, contractName: ContractName, hash: Hex, metadata: Record<string, unknown>) {
    const contractAddress = this.requireAddress(contractName);
    const tx: ContractTxRecord = {
      type,
      hash,
      contractName,
      contractAddress,
      createdAt: Date.now(),
      metadata
    };
    this.txs.unshift(tx);
    if (this.txs.length > 100) {
      this.txs.length = 100;
    }
    await this.eventBus.publish(
      CONTRACT_STREAM,
      createEventEnvelope({
        type,
        source: "agent:infrastructure:hardhat",
        data: tx
      })
    );
  }
}

function rpcUrl() {
  return process.env.HARDHAT_RPC_URL ?? process.env.NEXT_PUBLIC_HARDHAT_RPC_URL ?? DEFAULT_RPC;
}

function hashAgentCard(agentCard: Record<string, unknown>) {
  const json = JSON.stringify(agentCard, Object.keys(agentCard).sort());
  return `0x${createHash("sha256").update(json).digest("hex")}` as Hex;
}

function dealHash(dealId: string) {
  return keccak256(stringToHex(dealId));
}
