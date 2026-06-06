import { getSettlementService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function GET() {
  try {
    return json(getSettlementService().listEscrows());
  } catch (error) {
    return errorResponse(error);
  }
}
