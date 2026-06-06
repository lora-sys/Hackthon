import { getNegotiationService } from "@wishlive/backend";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return json(await getNegotiationService().counterProposal(safeDecode(id), await request.json()), 201);
  } catch (error) {
    return errorResponse(error);
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
