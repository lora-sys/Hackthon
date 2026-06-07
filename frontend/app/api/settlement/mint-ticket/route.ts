import { getNegotiationService, getSettlementService, SepoliaSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../../contracts/env";

export async function POST(request: Request) {
  try {
    loadContractEnv();
    const body = await request.json();
    const dealId = String(body.dealId);
    const deal = getNegotiationService().getDeal(dealId);
    const confirmed = deal.status === "CONFIRMED" || deal.status === "SETTLED";

    if (!confirmed) {
      return errorResponse(new Error("Human confirmation required"));
    }

    const hasContracts = !!(process.env.TICKET_NFT_ADDRESS && process.env.DEPLOYER_PRIVATE_KEY);
    if (hasContracts) {
      const sepoliaSettlement = new SepoliaSettlementService();
      const result = await sepoliaSettlement.mintTicket({
        dealId,
        to: body.to ?? "0x000000000000000000000000000000000000dEaD",
        metadataUri: body.metadataUri ?? `ipfs://wishlive/${encodeURIComponent(dealId)}`
      });
      return json(result, 201);
    }

    return json(
      await getSettlementService().mintTicket(body, { confirmed }),
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}