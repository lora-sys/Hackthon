import { getRegistryService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const service = getRegistryService();
    const response = await service.register(await request.json());
    return json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
