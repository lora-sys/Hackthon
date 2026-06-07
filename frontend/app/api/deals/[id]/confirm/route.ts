import { getNegotiationService } from "@wishlive/backend";
import { ConfirmDealRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../../_lib/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = ConfirmDealRequestSchema.parse(await readJson(request));
    return json(await getNegotiationService().confirmDeal(safeDecode(id), body.signature));
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: Request) {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }
  return JSON.parse(text) as unknown;
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
