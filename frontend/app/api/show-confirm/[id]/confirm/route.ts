import { getNegotiationService } from "@wishlive/backend";
import { ConfirmDealRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = { params: Promise<{ id: string }> };

// Fail closed until participant authorization, real payees and receipt-based IDs
// are implemented together. Never mutate the deal or send funds on this path.
export async function POST(request: Request, context: RouteContext) {
  try {
    const id = decodeURIComponent((await context.params).id);
    ConfirmDealRequestSchema.parse(await request.json());
    const deal = getNegotiationService().getDeal(id);
    if (deal.status !== "PENDING_CONFIRMATION") {
      return json({ error: `Deal cannot be confirmed from ${deal.status}` }, 409);
    }
    return json({
      code: "SETTLEMENT_NOT_READY",
      error: "结算暂未启用：需要真实参与者钱包、签名验证和链上回执校验。未扣款，订单仍待确认。 / Settlement disabled pending wallet authorization and receipt verification. No funds sent; deal remains pending."
    }, 503);
  } catch (error) {
    return errorResponse(error);
  }
}
