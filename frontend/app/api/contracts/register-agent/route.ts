import { getContractService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    return json(await getContractService().registerAgent(await request.json()), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
