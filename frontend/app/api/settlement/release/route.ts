import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const escrow = getSettlementService().getEscrow(String(body.escrowId));
    const deal = getNegotiationService().getDeal(escrow.dealId);
    const result = await getSettlementService().releaseFunds(body, {
      dealConfirmed: deal.status === "CONFIRMED" || deal.status === "SETTLED"
    });
    return json({ txHash: result.txHash });
  } catch (error) {
    return errorResponse(error);
  }
}
