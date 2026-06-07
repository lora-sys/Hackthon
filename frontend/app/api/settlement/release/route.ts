import { getNegotiationService, getSettlementService, SepoliaSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { loadContractEnv } from "../../contracts/env";

export async function POST(request: Request) {
  try {
    loadContractEnv();
    const body = await request.json();
    const escrowId = String(body.escrowId);

    const hasContracts = !!(process.env.ESCROW_ADDRESS && process.env.DEPLOYER_PRIVATE_KEY);
    if (hasContracts) {
      const sepoliaSettlement = new SepoliaSettlementService();
      const result = await sepoliaSettlement.releaseFunds({ escrowId, signature: body.signature ?? "local-human-confirmation" });
      return json(result);
    }

    const escrow = getSettlementService().getEscrow(escrowId);
    const deal = getNegotiationService().getDeal(escrow.dealId);
    const result = await getSettlementService().releaseFunds(body, {
      dealConfirmed: deal.status === "CONFIRMED" || deal.status === "SETTLED"
    });
    return json({ txHash: result.txHash });
  } catch (error) {
    return errorResponse(error);
  }
}