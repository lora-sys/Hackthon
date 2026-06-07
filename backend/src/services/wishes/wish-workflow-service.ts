import {
  DemandSchema,
  WishCreateRequestSchema,
  WishSchema,
  type Demand,
  type EventEnvelope,
  type MatchingResult,
  type Wish,
  type WishCreateRequest
} from "@wishlive/shared";
import type { EventBus } from "../events";
import { createEventEnvelope, MemoryEventBus } from "../events";
import type { RegistryService } from "../registry";
import { AgentRuntimeService } from "../runtime";
import { matchDemand } from "./matching-engine";

const MIN_THRESHOLD = 10;
const WISH_STREAM = "wish.events";
const DEMAND_STREAM = "demand.events";
const MATCHING_STREAM = "matching.events";

export class WishWorkflowService {
  private readonly wishes = new Map<string, Wish>();
  private readonly demands = new Map<string, Demand>();
  private readonly cohortDemandIds = new Map<string, string>();

  constructor(
    private readonly registry: RegistryService,
    private readonly eventBus: EventBus = new MemoryEventBus()
  ) {}

  async submitWish(input: unknown) {
    const request = WishCreateRequestSchema.parse(input);
    const now = Date.now();
    const wish = WishSchema.parse({
      wishId: `wish:${crypto.randomUUID()}`,
      userId: request.userId,
      artistName: request.artistName,
      genre: request.genre.toLowerCase(),
      city: request.city.toLowerCase(),
      preferredDate: request.date,
      depositAmount: request.depositAmount,
      status: "ACTIVE",
      createdAt: now
    });

    this.wishes.set(wish.wishId, wish);
    await this.publish(WISH_STREAM, "wish.created", "agent:audience:001", {
      wishId: wish.wishId,
      userId: wish.userId,
      artistName: wish.artistName,
      genre: wish.genre,
      city: wish.city,
      preferredDate: wish.preferredDate
    });

    const demand = await this.processWishWithAgents(wish, request, now);

    return {
      wishId: wish.wishId,
      demand,
      matching: demand?.matching ?? null,
      nextRoute: demand ? `/demand-pool/${encodeURIComponent(demand.demandId)}` : "/wish-pool"
    };
  }

  listWishes(input: { userId?: string; status?: Wish["status"] } = {}) {
    return [...this.wishes.values()]
      .filter((wish) => !input.userId || wish.userId === input.userId)
      .filter((wish) => !input.status || wish.status === input.status)
      .sort((left, right) => right.createdAt - left.createdAt);
  }

  listDemands() {
    return [...this.demands.values()].sort((left, right) => right.createdAt - left.createdAt);
  }

  getDemand(demandId: string) {
    if (demandId === "latest") {
      const latest = this.listDemands()[0];
      if (!latest) {
        throw new WishWorkflowError(404, "No demand pool has been created yet");
      }
      return latest;
    }

    const demand = this.demands.get(demandId);
    if (!demand) {
      throw new WishWorkflowError(404, `Demand not found: ${demandId}`);
    }
    return demand;
  }

  async withdrawWish(wishId: string) {
    const wish = this.wishes.get(wishId);
    if (!wish) {
      throw new WishWorkflowError(404, `Wish not found: ${wishId}`);
    }
    if (wish.status === "WITHDRAWN") {
      return { status: wish.status };
    }

    wish.status = "WITHDRAWN";
    await this.publish(WISH_STREAM, "wish.withdrawn", "agent:audience:001", {
      wishId
    });
    return { status: wish.status };
  }

  resetForTests() {
    this.wishes.clear();
    this.demands.clear();
    this.cohortDemandIds.clear();
  }

  private async processWishWithAgents(wish: Wish, request: WishCreateRequest, now: number) {
    const cohortKey = this.findCohortKey(wish);
    const cohortWishes = this.activeWishesForCohort(wish);
    const runtime = new AgentRuntimeService(this.registry, this.eventBus);
    await runtime.run({
      agentId: "agent:business:003",
      workflowId: `workflow:${wish.wishId}`,
      conversationId: `wish:${cohortKey}`,
      userMessage: `Process audience wish for ${wish.artistName} in ${wish.city}`,
      tools: [
        {
          name: "update_reputation",
          input: {
            agentId: "agent:business:003",
            delta: 0,
            reason: "wish processed"
          }
        }
      ],
      metadata: {
        wishId: wish.wishId,
        cohortKey
      }
    });
    await this.publish(WISH_STREAM, "wish.aggregated", "agent:business:003", {
      wishId: wish.wishId,
      cohortKey,
      count: cohortWishes.length,
      agentSkill: "aggregate_wishes"
    });

    let demand = this.getDemandForCohort(cohortKey);
    if (demand) {
      demand.wishCount = cohortWishes.length;
      demand.wishIds = cohortWishes.map((entry) => entry.wishId);
      this.demands.set(demand.demandId, DemandSchema.parse(demand));
      return this.demands.get(demand.demandId) ?? demand;
    }

    if (cohortWishes.length < MIN_THRESHOLD) {
      return null;
    }

    await this.publish(DEMAND_STREAM, "demand.threshold_reached", "agent:business:004", {
      cohortKey,
      count: cohortWishes.length,
      threshold: MIN_THRESHOLD,
      agentSkill: "check_threshold"
    });
    await runtime.run({
      agentId: "agent:business:004",
      workflowId: `workflow:${cohortKey}`,
      conversationId: `demand:${cohortKey}`,
      userMessage: `Create demand after ${cohortWishes.length} wishes reached threshold`,
      tools: [
        {
          name: "update_reputation",
          input: {
            agentId: "agent:business:004",
            delta: 0,
            reason: "demand threshold reached"
          }
        }
      ],
      metadata: {
        cohortKey,
        count: cohortWishes.length
      }
    });

    demand = DemandSchema.parse({
      demandId: `demand:${crypto.randomUUID()}`,
      artistName: request.artistName,
      genre: wish.genre,
      city: wish.city,
      preferredDate: wish.preferredDate,
      wishCount: cohortWishes.length,
      threshold: MIN_THRESHOLD,
      status: "MATCHING",
      wishIds: cohortWishes.map((entry) => entry.wishId),
      matching: null,
      createdAt: now
    });

    this.demands.set(demand.demandId, demand);
    this.cohortDemandIds.set(cohortKey, demand.demandId);
    await this.publish(DEMAND_STREAM, "demand.created", "agent:business:004", {
      demandId: demand.demandId,
      cohortKey,
      wishCount: demand.wishCount,
      threshold: demand.threshold,
      agentSkill: "create_demand"
    });

    const matching = await this.runMatching(demand);
    demand.status = "MATCHED";
    demand.matching = matching;
    this.demands.set(demand.demandId, DemandSchema.parse(demand));

    return this.demands.get(demand.demandId) ?? demand;
  }

  private async runMatching(demand: Demand): Promise<MatchingResult> {
    await this.publish(MATCHING_STREAM, "matching.started", "agent:business:005", {
      demandId: demand.demandId,
      genre: demand.genre,
      city: demand.city,
      agentSkill: "rank_candidates"
    });
    const runtime = new AgentRuntimeService(this.registry, this.eventBus);
    await runtime.run({
      agentId: "agent:business:005",
      workflowId: `workflow:${demand.demandId}`,
      conversationId: `matching:${demand.demandId}`,
      userMessage: `Discover musician and venue agents for ${demand.genre} in ${demand.city}`,
      tools: [
        {
          name: "discover_agents",
          input: {
            type: "musician",
            skill: "check_availability",
            genre: demand.genre,
            city: demand.city,
            date: demand.preferredDate,
            limit: 3
          }
        },
        {
          name: "discover_agents",
          input: {
            type: "venue",
            skill: "check_capacity",
            city: demand.city,
            capacity: Math.max(demand.wishCount, 200),
            date: demand.preferredDate,
            limit: 3
          }
        }
      ],
      metadata: {
        demandId: demand.demandId
      }
    });

    const matching = await matchDemand({
      demand,
      registry: this.registry
    });

    await this.publish(MATCHING_STREAM, "matching.completed", "agent:business:005", {
      demandId: demand.demandId,
      musicians: matching.musicians,
      venues: matching.venues,
      agentSkill: "rank_candidates"
    });

    return matching;
  }

  private findCohortKey(wish: Wish) {
    const existing = [...this.wishes.values()].find(
      (entry) =>
        entry.status === "ACTIVE" &&
        entry.genre === wish.genre &&
        entry.city === wish.city &&
        daysApart(entry.preferredDate, wish.preferredDate) <= 3
    );

    return [
      existing?.genre ?? wish.genre,
      existing?.city ?? wish.city,
      existing?.preferredDate ?? wish.preferredDate
    ].join("|");
  }

  private activeWishesForCohort(wish: Wish) {
    return [...this.wishes.values()].filter(
      (entry) =>
        entry.status === "ACTIVE" &&
        entry.genre === wish.genre &&
        entry.city === wish.city &&
        daysApart(entry.preferredDate, wish.preferredDate) <= 3
    );
  }

  private getDemandForCohort(cohortKey: string) {
    const demandId = this.cohortDemandIds.get(cohortKey);
    return demandId ? this.demands.get(demandId) : undefined;
  }

  private async publish(stream: string, type: string, source: string, data: Record<string, unknown>) {
    const event = createEventEnvelope({
      type,
      source,
      data
    }) satisfies EventEnvelope;
    await this.eventBus.publish(stream, event);
  }
}

export class WishWorkflowError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "WishWorkflowError";
  }
}

function daysApart(left: string, right: string) {
  const leftTime = new Date(`${left}T00:00:00Z`).getTime();
  const rightTime = new Date(`${right}T00:00:00Z`).getTime();
  return Math.abs(leftTime - rightTime) / 86_400_000;
}
