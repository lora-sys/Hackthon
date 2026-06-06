import type { AgentCard, AgentType } from "@wishlive/shared";

const walletBase = "000000000000000000000000000000000000";

function wallet(index: number) {
  return `0x${walletBase}${index.toString(16).padStart(4, "0")}`.slice(0, 42);
}

function card(input: {
  index: number;
  type: AgentType;
  name: string;
  skills: string[];
  tags?: string[];
  reputation?: number;
  metadata?: Record<string, unknown>;
}): AgentCard {
  return {
    agent_id: `agent:${input.type}:${input.index.toString().padStart(3, "0")}`,
    did: `did:wishlive:${input.type}:${input.index.toString().padStart(3, "0")}`,
    wallet: wallet(input.index),
    type: input.type,
    skills: input.skills,
    tags: input.tags ?? [],
    reputation: input.reputation ?? 70,
    metadata: {
      name: input.name,
      ...(input.metadata ?? {})
    }
  };
}

export function createSeedAgentCards(): AgentCard[] {
  const cards: AgentCard[] = [];
  const genres = ["rock", "pop", "jazz", "electronic", "folk"];
  const cities = ["shanghai", "beijing", "shenzhen"];
  const capacities = [200, 500, 1000];

  for (let index = 1; index <= 10; index += 1) {
    cards.push(
      card({
        index,
        type: "audience",
        name: `Audience Agent ${index}`,
        skills: ["submit_wish", "withdraw_wish", "confirm_show"],
        reputation: 60 + index
      })
    );
  }

  for (let index = 1; index <= 15; index += 1) {
    const genre = genres[(index - 1) % genres.length] ?? "rock";
    const city = cities[(index - 1) % cities.length] ?? "shanghai";
    cards.push(
      card({
        index,
        type: "musician",
        name: `Musician Agent ${index}`,
        skills: ["check_availability", "propose_offer", "counter_offer", "accept_offer", "reject_offer"],
        tags: [`genre:${genre}`, `city:${city}`],
        reputation: 72 + (index % 20),
        metadata: {
          genre,
          city,
          availability: index % 2 === 0 ? "weekends" : "weeknights",
          splitPreference: 20 + (index % 4) * 5
        }
      })
    );
  }

  for (let index = 1; index <= 10; index += 1) {
    const city = cities[(index - 1) % cities.length] ?? "shanghai";
    const capacity = capacities[(index - 1) % capacities.length] ?? 500;
    cards.push(
      card({
        index,
        type: "venue",
        name: `Venue Agent ${index}`,
        skills: ["check_capacity", "quote_price", "counter_offer", "accept_offer", "reject_offer"],
        tags: [`city:${city}`, `capacity:${capacity}`],
        reputation: 68 + (index % 25),
        metadata: {
          city,
          capacity,
          splitPreference: 20
        }
      })
    );
  }

  [
    ["musician-manager", "manage_musicians"],
    ["venue-manager", "manage_venues"],
    ["organizer", "create_event"]
  ].forEach(([name, skill], offset) => {
    cards.push(
      card({
        index: offset + 1,
        type: "manager",
        name: `${name} Agent`,
        skills: [skill ?? "manage_agents", "sync_agent_status"],
        tags: ["layer:manager"],
        reputation: 90
      })
    );
  });

  [
    ["onboarding", ["guide_wallet_connect", "guide_agent_creation", "complete_onboarding"]],
    ["concierge", ["explain_status", "search_musician_info", "explain_failure", "suggest_next_step"]],
    ["wishmaker", ["process_wish", "aggregate_wishes", "publish_wish_event"]],
    ["demand-pool", ["create_demand", "check_threshold", "merge_demands"]],
    ["matching", ["find_musicians", "find_venues", "rank_candidates"]],
    ["negotiation", ["create_negotiation", "route_proposal", "detect_timeout"]],
    ["settlement", ["create_escrow", "release_funds", "mint_ticket"]],
    ["showconfirm", ["notify_user", "confirm_show", "trigger_settlement"]],
    ["reputation", ["score_agent", "update_reputation", "explain_score"]]
  ].forEach(([name, skills], offset) => {
    cards.push(
      card({
        index: offset + 1,
        type: "business",
        name: `${name} Agent`,
        skills: skills as string[],
        tags: ["layer:business"],
        reputation: 95
      })
    );
  });

  [
    "registry",
    "event-bus",
    "memory-store",
    "hardhat-node",
    "postgres",
    "redis",
    "file-storage",
    "langfuse",
    "mcp-gateway",
    "dashboard-metrics"
  ].forEach((name, offset) => {
    cards.push(
      card({
        index: offset + 1,
        type: "infrastructure",
        name: `${name} Agent`,
        skills: ["observe", "report_status"],
        tags: ["layer:infrastructure"],
        reputation: 100
      })
    );
  });

  return cards;
}
