import { getRegistryService } from "@wishlive/backend";
import { RegistrySearchRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    const service = getRegistryService();
    await service.ensureSeeded();
    const query = RegistrySearchRequestSchema.parse(await request.json());
    return json(service.search(query));
  } catch (error) {
    return errorResponse(error);
  }
}
