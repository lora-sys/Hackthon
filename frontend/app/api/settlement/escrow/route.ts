import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { SepoliaSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../../contracts/env";

async function getSepoliaSettlement() {
  loadContractEnv();
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
  const hasContracts = !!(process.env.ESCROW_ADDRESS && process.env.TICKET_NFT_ADDRESS && process.env.DEPLOYER_PRIVATE_KEY);
  if (hasContracts) {
    return new SepoliaSettlementService();
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deal = getNegotiationService().getDeal(String(body.dealId));
    const confirmed = deal.status === "CONFIRMED" || deal.status === "SETTLED";

    if (!confirmed) {
      return errorResponse(new Error("Human confirmation required"));
    }

    const sepoliaSettlement = await getSepoliaSettlement();
    if (sepoliaSettlement) {
      const result = await sepoliaSettlement.createEscrow({
        dealId: String(body.dealId),
        payees: deal.terms.payees ?? ["0x000000000000000000000000000000000000dEaD"],
        shares: deal.terms.shares ?? [50, 50],
        amount: deal.terms.venueFee ?? 1_000
      });
      return json(result, 201);
    }

    return json(await getSettlementService().createEscrow(body, { confirmed, amount: deal.terms.venueFee }), 201);
  } catch (error) {
    return errorResponse(error);
  }
}