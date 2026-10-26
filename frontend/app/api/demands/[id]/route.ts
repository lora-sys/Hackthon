import { RedisEventBus, getRegistryService, getWishWorkflowService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";
import { matchingReadiness } from "../../../../lib/matching-readiness";

const STREAMS = ["wish.events", "demand.events", "matching.events", "agent.runtime", "a2a.discovery"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const eventBus = new RedisEventBus();
  try {
    const { id } = await context.params;
    const demand = getWishWorkflowService().getDemand(safeDecode(id));
    const readiness = matchingReadiness(demand.matching);
    const registry = getRegistryService();
    await registry.ensureSeeded();
    const history = await eventBus.readRecent(STREAMS, 100);
    const cohortKey = `${demand.genre}|${demand.city}|${demand.preferredDate}`;
    const events = history.filter(({ event }) => {
      const data = event.data;
      return (
        data.demandId === demand.demandId ||
        data.cohortKey === cohortKey ||
        data.genre === demand.genre ||
        data.city === demand.city
      );
    });

    return json({
      demand,
      musicianCards: (demand.matching?.musicians ?? []).map((candidate) => registry.get(candidate.agentId)),
      venueCards: (demand.matching?.venues ?? []).map((candidate) => registry.get(candidate.agentId)),
      events,
      analysis: {
        ...readiness,
        demandScore: null,
        probability: null,
        completed: [
          "Audience clustering completed",
          readiness.venues > 0 ? "Venue candidates found" : "Venue candidates pending",
          readiness.musicians > 0 ? "Musician candidates found" : "Musician candidates pending"
        ]
      }
    });
  } catch (error) {
    return errorResponse(error);
  } finally {
    await eventBus.close();
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
