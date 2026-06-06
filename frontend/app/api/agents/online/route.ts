import { getRegistryService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function GET() {
  try {
    const service = getRegistryService();
    await service.ensureSeeded();
    return json(service.onlineCount());
  } catch (error) {
    return errorResponse(error);
  }
}
