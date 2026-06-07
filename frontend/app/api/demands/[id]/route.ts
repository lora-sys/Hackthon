import { RedisEventBus, getRegistryService, getWishWorkflowService } from "@wishlive/backend";
import { errorResponse, json } from "../../_lib/respond";

const STREAMS = ["wish.events", "demand.events", "matching.events", "agent.runtime", "a2a.discovery"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const eventBus = new RedisEventBus();
  try {
    const { id } = await context.params;
    const demand = getWishWorkflowService().getDemand(safeDecode(id));
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
        demandScore: Math.min(99, Math.round(demand.wishCount * 7.5 + (demand.matching ? 17 : 0))),
        probability: demand.matching ? 87 : Math.min(80, demand.wishCount * 8),
        completed: [
          "Audience clustering completed",
          demand.matching ? "Venue capacity matched" : "Venue capacity pending",
          demand.matching ? "Musician availability found" : "Musician availability pending"
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
