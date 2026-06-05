import { getRegistryService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

export async function GET(
  _request: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const service = getRegistryService();
    await service.ensureSeeded();
    return json(service.get(agentId));
  } catch (error) {
    return errorResponse(error);
  }
}
