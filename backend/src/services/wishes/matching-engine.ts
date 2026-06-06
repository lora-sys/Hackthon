import type { AgentCard, Demand, MatchCandidate, MatchingResult } from "@wishlive/shared";
import type { RegistryService } from "../registry";

export const MATCHING_WEIGHTS = {
  genre: 40,
  location: 30,
  availability: 20,
  reputation: 10
} as const;

export async function matchDemand(input: {
  demand: Demand;
  registry: RegistryService;
  now?: number;
}): Promise<MatchingResult> {
  await input.registry.ensureSeeded();

  const musicianPool = input.registry.list({ type: "musician" });
  const venuePool = input.registry.list({ type: "venue" });

  return {
    demandId: input.demand.demandId,
    musicians: topCandidates(musicianPool, input.demand, "musician"),
    venues: topCandidates(venuePool, input.demand, "venue"),
    createdAt: input.now ?? Date.now()
  };
}

export function scoreCandidate(card: AgentCard, demand: Demand, role: "musician" | "venue"): MatchCandidate {
  const genre = role === "musician" && hasValue(card, "genre", demand.genre) ? MATCHING_WEIGHTS.genre : 0;
  const location = hasValue(card, "city", demand.city) ? MATCHING_WEIGHTS.location : 0;
  const availability = isAvailable(card, demand.preferredDate) ? MATCHING_WEIGHTS.availability : 0;
  const reputation = Math.round((card.reputation / 100) * MATCHING_WEIGHTS.reputation);
  const score = genre + location + availability + reputation;

  return {
    agentId: card.agent_id,
    name: String(card.metadata.name ?? card.agent_id),
    score,
    reason: [
      `genre:${genre}`,
      `city:${location}`,
      `availability:${availability}`,
      `reputation:${reputation}`
    ].join("+"),
    factors: {
      genre,
      location,
      availability,
      reputation
    }
  };
}

function topCandidates(cards: AgentCard[], demand: Demand, role: "musician" | "venue") {
  return cards
    .map((card) => scoreCandidate(card, demand, role))
    .sort((left, right) => right.score - left.score || left.agentId.localeCompare(right.agentId))
    .slice(0, 3);
}

function hasValue(card: AgentCard, key: "genre" | "city", value: string) {
  return card.tags.includes(`${key}:${value}`) || card.metadata[key] === value;
}

function isAvailable(card: AgentCard, preferredDate: string) {
  const day = new Date(`${preferredDate}T00:00:00Z`).getUTCDay();
  const availability = String(card.metadata.availability ?? "always");
  if (availability === "weekends") {
    return day === 0 || day === 6;
  }
  if (availability === "weeknights") {
    return day >= 1 && day <= 5;
  }
  return true;
}
