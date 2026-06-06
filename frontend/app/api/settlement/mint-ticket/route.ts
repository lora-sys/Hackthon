import { getNegotiationService, getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deal = await getNegotiationService().getDealOrRecover(String(body.dealId));
    return json(
      await getSettlementService().mintTicket(body, {
        confirmed: deal.status === "CONFIRMED" || deal.status === "SETTLED"
      }),
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
