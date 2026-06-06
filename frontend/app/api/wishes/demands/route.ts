import { getWishWorkflowService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function GET() {
  try {
    return json(getWishWorkflowService().listDemands());
  } catch (error) {
    return errorResponse(error);
  }
}
