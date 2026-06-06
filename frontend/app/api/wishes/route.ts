import { getNegotiationService, getWishWorkflowService } from "@wishlive/backend";
import { WishStatusSchema } from "@wishlive/shared";
import { errorResponse, json } from "../_lib/respond";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? undefined;
    const rawStatus = url.searchParams.get("status");
    const service = getWishWorkflowService();
    const query: { userId?: string; status?: "ACTIVE" | "FULFILLED" | "WITHDRAWN" } = {};
    if (userId) {
      query.userId = userId;
    }
    if (rawStatus) {
      query.status = WishStatusSchema.parse(rawStatus);
    }

    return json(service.listWishes(query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const service = getWishWorkflowService();
    const payload = await request.json();
    const result = await service.submitWish(payload);
    if (!result.demand?.matching) {
      return json(result, 201);
    }

    const negotiation = await getNegotiationService().runAutonomousNegotiation(result.demand);
    return json(
      {
        ...result,
        negotiationId: negotiation.negotiationId
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
