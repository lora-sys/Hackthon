import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../env";
import { createPublicClient, http } from "viem";

export async function GET() {
  try {
    loadContractEnv();
    const settlement = getSettlementService();
    const deals = getNegotiationService().listDeals();
    const escrows = settlement.listEscrows();
    const tickets = settlement.listTickets();
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.HARDHAT_CHAIN_ID ?? 31337);
    const isSepolia = chainId === 11155111;
    const rpcUrl = isSepolia ? process.env.SEPOLIA_RPC_URL : process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545";
    let health = "unavailable";
    if (rpcUrl) {
      try {
        const actualChainId = await createPublicClient({ transport: http(rpcUrl, { timeout: 2000, retryCount: 0 }) }).getChainId();
        health = actualChainId === chainId ? "healthy" : "wrong-chain";
      } catch { /* Report the dependency failure instead of claiming health. */ }
    }
    return json({
      chainId,
      rpcUrl: isSepolia ? "sepolia-configured" : process.env.HARDHAT_RPC_URL ?? "http://127.0.0.1:8545",
      mode: isSepolia ? "sepolia-sponsored" : "localnet-sponsored",
      contracts: {
        AgentProfile: process.env.AGENT_PROFILE_ADDRESS ?? "localnet:AgentProfile",
        Escrow: process.env.ESCROW_ADDRESS ?? "localnet:Escrow",
        TicketNFT: process.env.TICKET_NFT_ADDRESS ?? "localnet:TicketNFT"
      },
      counts: {
        deals: deals.length,
        escrows: escrows.length,
        tickets: tickets.length,
        tx: escrows.length + tickets.length
      },
      latestTx: [...escrows.map((entry) => entry.txHash), ...tickets.map((entry) => entry.txHash)].at(-1) ?? null,
      health
    });
  } catch (error) {
    return errorResponse(error);
  }
}
