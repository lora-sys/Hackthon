import { getConciergeService } from "@wishlive/backend";
import { errorResponse } from "../../_lib/respond";

export async function POST(request: Request) {
  try {
    return await getConciergeService().stream(await request.json());
  } catch (error) {
    return errorResponse(error);
  }
}
