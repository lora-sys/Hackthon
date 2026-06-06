import { getNegotiationService } from "@wishlive/backend";
import { ConfirmDealRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = ConfirmDealRequestSchema.parse(await request.json());
    return json(await getNegotiationService().confirmDeal(id, body.signature));
  } catch (error) {
    return errorResponse(error);
  }
}
