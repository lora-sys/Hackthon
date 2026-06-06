import { getRegistryService } from "@wishlive/backend";
import { RegistryHeartbeatRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const { agentId } = RegistryHeartbeatRequestSchema.parse(await request.json());
    const response = await getRegistryService().heartbeat(agentId);
    return json(response);
  } catch (error) {
    return errorResponse(error);
  }
}
