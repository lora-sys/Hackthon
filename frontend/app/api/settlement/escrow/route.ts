import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deal = getNegotiationService().getDeal(String(body.dealId));
    return json(
      await getSettlementService().createEscrow(body, {
        confirmed: deal.status === "CONFIRMED" || deal.status === "SETTLED",
        amount: deal.terms.venueFee
      }),
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
