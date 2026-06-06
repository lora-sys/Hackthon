import { getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return json(getSettlementService().getEscrow(id));
  } catch (error) {
    return errorResponse(error);
  }
}
