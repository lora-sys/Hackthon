import { getRegistryService } from "@wishlive/backend";
import { RegistrySearchRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const service = getRegistryService();
    await service.ensureSeeded();
    const query = RegistrySearchRequestSchema.parse(await request.json());
    const result = await service.discover(query);
    return json(result.agents);
  } catch (error) {
    return errorResponse(error);
  }
}
