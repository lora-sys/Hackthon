import { getWishWorkflowService } from "@wishlive/backend";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return json(await getWishWorkflowService().withdrawWish(id));
  } catch (error) {
    return errorResponse(error);
  }
}
