import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../env";

export async function GET() {
  try {
    loadContractEnv();
    const settlement = getSettlementService();
    const deals = getNegotiationService().listDeals();
    const escrows = settlement.listEscrows();
    const tickets = settlement.listTickets();
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? process.env.HARDHAT_CHAIN_ID ?? 31337);
    const isSepolia = chainId === 11155111;
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
      health: "healthy"
    });
  } catch (error) {
    return errorResponse(error);
  }
}