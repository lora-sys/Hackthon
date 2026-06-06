import { listRuntimeSessions } from "@wishlive/backend";
import { RuntimeSessionListRequestSchema } from "@wishlive/shared";
import { errorResponse, json } from "../../_lib/respond";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return json(
      listRuntimeSessions(
        RuntimeSessionListRequestSchema.parse({
          agentId: url.searchParams.get("agentId") ?? undefined,
          workflowId: url.searchParams.get("workflowId") ?? undefined,
          conversationId: url.searchParams.get("conversationId") ?? undefined
        })
      )
    );
  } catch (error) {
    return errorResponse(error);
  }
}
