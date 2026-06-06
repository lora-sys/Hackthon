import { getNegotiationService } from "@wishlive/backend";
import { RejectDealRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = RejectDealRequestSchema.parse(await request.json());
    return json(await getNegotiationService().rejectDeal(id, body.reason));
  } catch (error) {
    return errorResponse(error);
  }
}
