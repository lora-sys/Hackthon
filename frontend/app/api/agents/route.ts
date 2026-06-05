import { getRegistryService } from "@wishlive/backend";
import { AgentStatusSchema, AgentTypeSchema } from "@wishlive/shared";
import { errorResponse, json } from "../_lib/respond";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status");
    const rawType = url.searchParams.get("type");
    const service = getRegistryService();
    await service.ensureSeeded();

    return json(
      service.list({
        status: rawStatus ? AgentStatusSchema.parse(rawStatus) : undefined,
        type: rawType ? AgentTypeSchema.parse(rawType) : undefined
      })
    );
  } catch (error) {
    return errorResponse(error);
  }
}
