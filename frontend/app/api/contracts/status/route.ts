import { getContractService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function GET() {
  try {
    return json(await getContractService().status());
  } catch (error) {
    return errorResponse(error);
  }
}
