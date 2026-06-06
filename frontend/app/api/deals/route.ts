import { getNegotiationService } from "@wishlive/backend";
import { DealStatusSchema } from "@wishlive/shared";
import { errorResponse, json } from "../_lib/respond";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status");
    const query: { status?: "PENDING_CONFIRMATION" | "CONFIRMED" | "REJECTED" | "SETTLED" | "FAILED" } = {};
    if (rawStatus) {
      query.status = DealStatusSchema.parse(rawStatus);
    }
    return json(getNegotiationService().listDeals(query));
  } catch (error) {
    return errorResponse(error);
  }
}
