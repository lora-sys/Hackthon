import { RedisEventBus } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

const STREAMS = [
  "agent.lifecycle",
  "agent.task",
  "agent.runtime",
  "a2a.discovery",
  "wish.events",
  "demand.events",
  "matching.events",
  "negotiation.events",
  "settlement.events",
  "show.events",
  "contract.events",
  "concierge.events"
];

export async function GET() {
  const eventBus = new RedisEventBus();
  try {
    const events = await eventBus.readRecent(STREAMS, 30);
    return json(events.slice(0, 100));
  } catch (error) {
    return errorResponse(error);
  } finally {
    await eventBus.close();
  }
}
