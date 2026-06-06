import type { AgentCard, AgentSkillDetail, AgentType, ReputationBreakdown } from "@wishlive/shared";

const walletBase = "000000000000000000000000000000000000";
const genres = ["rock", "pop", "jazz", "electronic", "folk"] as const;
const cities = ["shanghai", "beijing", "shenzhen"] as const;
const capacities = [200, 500, 1000] as const;

function wallet(index: number) {
  return `0x${walletBase}${index.toString(16).padStart(4, "0")}`.slice(0, 42);
}

function skill(id: string, description: string, tags: string[] = []): AgentSkillDetail {
  return {
    id,
    name: id
      .split("_")
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(" "),
    description,
    tags,
    examples: [`${id} for WishLive workflow`]
  };
}

function reputation(input: Partial<ReputationBreakdown> & { score: number }): ReputationBreakdown {
  return {
    completedDeals: input.completedDeals ?? Math.max(0, Math.round(input.score / 8)),
    failures: input.failures ?? Math.max(0, 10 - Math.round(input.score / 12)),
    complaints: input.complaints ?? 0,
    responseTimeScore: input.responseTimeScore ?? input.score,
    fulfillmentRate: input.fulfillmentRate ?? Math.min(0.99, Math.max(0.65, input.score / 100)),
    score: input.score
  };
}

function card(input: {
  index: number;
  type: AgentType;
  slug: string;
  name: string;
  description: string;
  skills: AgentSkillDetail[];
  tags?: string[];
  reputation?: number;
  metadata?: Record<string, unknown>;
  managerAgentId?: string;
  listenStreams?: string[];
  emitEvents?: string[];
  systemPrompt?: string;
}): AgentCard {
  const agentId = `agent:${input.type}:${input.index.toString().padStart(3, "0")}`;
  const score = input.reputation ?? 70;

  return {
    agent_id: agentId,
    did: `did:wishlive:${input.slug}:${input.index.toString().padStart(3, "0")}`,
    wallet: wallet(input.index),
    type: input.type,
    name: input.name,
    description: input.description,
    skills: input.skills.map((entry) => entry.id),
    skill_details: input.skills,
    tags: input.tags ?? [],
    reputation: score,
    reputationBreakdown: reputation({ score }),
    supported_interfaces: [
      {
        url: `redis://agent.task/${agentId}`,
        protocol_binding: "Redis+JSON",
        protocol_version: "1.0",
        tenant: "wishlive"
      }
    ],
    capabilities: {
      streaming: true,
      push_notifications: false,
      tool_calls: true,
      a2a_discovery: true
    },
    default_input_modes: ["application/json", "text/plain"],
    default_output_modes: ["application/json", "text/plain"],
    managerAgentId: input.managerAgentId,
    listenStreams: input.listenStreams ?? [],
    emitEvents: input.emitEvents ?? [],
    systemPrompt:
      input.systemPrompt ??
      `You are ${input.name}. Act only through your registered WishLive tools and publish every result as an event.`,
    metadata: {
      name: input.name,
      slug: input.slug,
      ...(input.metadata ?? {})
    }
  };
}

export function createSeedAgentCards(): AgentCard[] {
  const cards: AgentCard[] = [];

  for (let index = 1; index <= 10; index += 1) {
    cards.push(
      card({
        index,
        type: "audience",
        slug: `audience-${index}`,
        name: `Audience Agent ${index}`,
        description: "Represents an audience member who submits wishes and confirms shows.",
        skills: [
          skill("submit_wish", "Submit a live show wish", ["wish"]),
          skill("withdraw_wish", "Withdraw an active wish", ["wish"]),
          skill("confirm_show", "Confirm a proposed show", ["human-confirm"])
        ],
        tags: [`city:${cities[(index - 1) % cities.length]}`, "role:audience"],
        reputation: 60 + index,
        listenStreams: ["show.events"],
        emitEvents: ["wish.created", "wish.withdrawn", "show.confirmed"],
        metadata: {
          city: cities[(index - 1) % cities.length],
          preferredGenres: [genres[(index - 1) % genres.length], genres[index % genres.length]],
          depositBudget: 20 + index * 5
        }
      })
    );
  }

  for (let index = 1; index <= 15; index += 1) {
    const genre = index <= 3 ? "rock" : genres[(index - 1) % genres.length] ?? "rock";
    const city = index <= 3 ? "shanghai" : cities[(index - 1) % cities.length] ?? "shanghai";
    const managerAgentId = "agent:manager:001";
    cards.push(
      card({
        index,
        type: "musician",
        slug: `musician-${index}`,
        name: musicianName(index, genre),
        description: `A ${genre} musician agent based in ${city}, able to negotiate fees and revenue split.`,
        skills: [
          skill("check_availability", "Check musician availability for a requested date", ["availability"]),
          skill("propose_offer", "Create an initial musician offer", ["negotiation"]),
          skill("counter_offer", "Respond with a counter proposal", ["negotiation"]),
          skill("accept_offer", "Accept a proposal", ["negotiation"]),
          skill("reject_offer", "Reject a proposal", ["negotiation"])
        ],
        tags: [`genre:${genre}`, `city:${city}`, "role:musician", `manager:${managerAgentId}`],
        reputation: 72 + (index % 20),
        managerAgentId,
        listenStreams: ["agent.task", "negotiation.events"],
        emitEvents: ["proposal.sent", "proposal.countered", "proposal.accepted", "proposal.rejected"],
        metadata: {
          genre,
          city,
          availability: index % 2 === 0 ? "weekends" : "weeknights",
          availabilityCalendar: availabilityCalendar(index),
          minFee: 2_000 + index * 120,
          splitPreference: 20 + (index % 4) * 5,
          managerAgentId,
          stageNeeds: ["soundcheck", "green-room", genre === "electronic" ? "visuals" : "standard-backline"]
        },
        systemPrompt:
          "You are a musician agent. Negotiate for fair minimum fee, schedule feasibility, and a sustainable revenue split. Use check_availability, propose_offer, counter_offer, accept_offer, reject_offer."
      })
    );
  }

  for (let index = 1; index <= 10; index += 1) {
    const city = index <= 3 ? "shanghai" : cities[(index - 1) % cities.length] ?? "shanghai";
    const capacity = index <= 3 ? capacities[index - 1] ?? 500 : capacities[(index - 1) % capacities.length] ?? 500;
    const managerAgentId = "agent:manager:002";
    cards.push(
      card({
        index,
        type: "venue",
        slug: `venue-${index}`,
        name: venueName(index, city),
        description: `A ${capacity}-capacity venue agent in ${city}, able to quote price and negotiate revenue split.`,
        skills: [
          skill("check_capacity", "Check whether the venue can host the expected audience", ["capacity"]),
          skill("quote_price", "Quote venue base fee", ["pricing"]),
          skill("counter_offer", "Counter a proposed split or fee", ["negotiation"]),
          skill("accept_offer", "Accept a proposed show deal", ["negotiation"]),
          skill("reject_offer", "Reject a proposed show deal", ["negotiation"])
        ],
        tags: [`city:${city}`, `capacity:${capacity}`, "role:venue", `manager:${managerAgentId}`],
        reputation: 68 + (index % 25),
        managerAgentId,
        listenStreams: ["agent.task", "negotiation.events"],
        emitEvents: ["proposal.sent", "proposal.countered", "proposal.accepted", "proposal.rejected"],
        metadata: {
          city,
          capacity,
          baseFee: 3_000 + capacity * 4,
          availableDates: availabilityCalendar(index + 10),
          splitPreference: 18 + (index % 3) * 4,
          managerAgentId,
          amenities: ["lighting", "bar", capacity >= 500 ? "vip-balcony" : "standing-room"]
        },
        systemPrompt:
          "You are a venue agent. Protect venue margin, capacity, dates, and operations. Use check_capacity, quote_price, counter_offer, accept_offer, reject_offer."
      })
    );
  }

  [
    {
      name: "Musician Manager Agent",
      slug: "musician-manager",
      skillIds: [
        skill("manage_musicians", "Manage musician roster and discovery", ["manager", "discovery"]),
        skill("sync_musician_status", "Sync musician availability and reputation", ["manager"])
      ],
      listenStreams: ["agent.lifecycle", "a2a.discovery"],
      emitEvents: ["musician.synced", "manager.search.performed", "a2a.discovery.result"]
    },
    {
      name: "Venue Manager Agent",
      slug: "venue-manager",
      skillIds: [
        skill("manage_venues", "Manage venue roster and discovery", ["manager", "discovery"]),
        skill("sync_venue_status", "Sync venue capacity and availability", ["manager"])
      ],
      listenStreams: ["agent.lifecycle", "a2a.discovery"],
      emitEvents: ["venue.synced", "manager.search.performed", "a2a.discovery.result"]
    },
    {
      name: "Organizer Agent",
      slug: "organizer",
      skillIds: [skill("create_event", "Create an event from a matched demand", ["workflow"]), skill("cancel_event", "Cancel a failed event", ["workflow"])],
      listenStreams: ["demand.events", "show.events"],
      emitEvents: ["event.ready", "event.cancelled"]
    }
  ].forEach((manager, offset) => {
    cards.push(
      card({
        index: offset + 1,
        type: "manager",
        slug: manager.slug,
        name: manager.name,
        description: `${manager.name} coordinates A2A discovery and workflow routing.`,
        skills: manager.skillIds,
        tags: ["layer:manager", `manager:${manager.slug}`],
        reputation: 90 + offset,
        listenStreams: manager.listenStreams,
        emitEvents: manager.emitEvents,
        metadata: {
          managedTypes: offset === 0 ? ["musician"] : offset === 1 ? ["venue"] : ["event"],
          discoveryScope: offset === 0 ? "musician-roster" : offset === 1 ? "venue-roster" : "workflow"
        }
      })
    );
  });

  [
    ["onboarding", ["guide_wallet_connect", "guide_agent_creation", "complete_onboarding"], ["user.registered"], ["onboarding.completed", "onboarding.failed"]],
    ["concierge", ["explain_status", "search_musician_info", "explain_failure", "suggest_next_step"], ["agent.lifecycle", "wish.events", "demand.events", "matching.events", "negotiation.events", "settlement.events"], ["concierge.notification"]],
    ["wishmaker", ["process_wish", "aggregate_wishes", "publish_wish_event"], ["wish.events"], ["wish.aggregated"]],
    ["demand-pool", ["create_demand", "check_threshold", "merge_demands"], ["wish.events"], ["demand.threshold_reached", "demand.created"]],
    ["matching", ["discover_agents", "find_musicians", "find_venues", "rank_candidates"], ["demand.events"], ["a2a.discovery.started", "matching.started", "matching.completed"]],
    ["negotiation", ["create_negotiation", "route_proposal", "detect_timeout"], ["matching.events", "agent.task"], ["negotiation.started", "proposal.sent", "proposal.countered", "deal.created"]],
    ["settlement", ["create_escrow", "release_funds", "mint_ticket"], ["deal.created", "show.events"], ["escrow.created", "ticket.minted"]],
    ["showconfirm", ["notify_user", "confirm_show", "trigger_settlement"], ["deal.created"], ["show.confirmed", "show.rejected"]],
    ["reputation", ["score_agent", "update_reputation", "explain_score"], ["deal.created", "proposal.rejected"], ["reputation.updated"]]
  ].forEach(([slug, skillIds, listenStreams, emitEvents], offset) => {
    const skills = (skillIds as string[]).map((id) => skill(id, `${id} tool for ${slug} agent`, ["business"]));
    cards.push(
      card({
        index: offset + 1,
        type: "business",
        slug: String(slug),
        name: `${String(slug)} Agent`,
        description: `Business workflow agent responsible for ${String(slug)} operations.`,
        skills,
        tags: ["layer:business", `business:${String(slug)}`],
        reputation: 95,
        listenStreams: listenStreams as string[],
        emitEvents: emitEvents as string[],
        metadata: {
          workflowRole: slug,
          toolLoopAgent: true
        },
        systemPrompt: `You are the ${String(slug)} Agent in WishLive. Use registered tools, explain decisions briefly, and emit events for every state change.`
      })
    );
  });

  [
    "registry",
    "a2a-discovery",
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
        slug: name,
        name: `${name} Agent`,
        description: `Infrastructure agent for ${name} status and observability.`,
        skills: [skill("observe", "Observe infrastructure health", ["observability"]), skill("report_status", "Report infrastructure status", ["observability"])],
        tags: ["layer:infrastructure", `infra:${name}`],
        reputation: 100,
        listenStreams: ["agent.lifecycle"],
        emitEvents: ["infrastructure.status"],
        metadata: {
          service: name
        }
      })
    );
  });

  return cards;
}

function availabilityCalendar(index: number) {
  const dates = ["2026-07-17", "2026-07-18", "2026-07-19", "2026-07-24", "2026-07-25"];
  return dates.filter((_, offset) => (offset + index) % 2 === 0 || offset === 0);
}

function musicianName(index: number, genre: string) {
  const names = ["Neon Harbor", "Velvet Signal", "North Bund", "Electric Jade", "Midnight Ferry"];
  return `${names[(index - 1) % names.length]} ${genre.toUpperCase()} Agent ${index}`;
}

function venueName(index: number, city: string) {
  const names = ["Warehouse", "Blue Hall", "Skyline", "River Stage", "Pulse Room"];
  return `${city.toUpperCase()} ${names[(index - 1) % names.length]} Venue ${index}`;
}
