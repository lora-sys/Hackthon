import { getNegotiationService } from "@wishlive/backend";
import { NegotiationStatusSchema } from "@wishlive/shared";
import { errorResponse, json } from "../_lib/respond";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const agentId = url.searchParams.get("agentId") ?? undefined;
    const rawStatus = url.searchParams.get("status");
    const query: { agentId?: string; status?: "PENDING" | "ACTIVE" | "ACCEPTED" | "REJECTED" | "TIMEOUT" | "DEAL_CREATED" } = {};
    if (agentId) {
      query.agentId = agentId;
    }
    if (rawStatus) {
      query.status = NegotiationStatusSchema.parse(rawStatus);
    }

    return json(getNegotiationService().list(query));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const service = getNegotiationService();
    return json(await service.createNegotiation(await request.json()), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
