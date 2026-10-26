import type { Demand, Wish } from "@wishlive/shared";
import { matchingReadiness } from "./matching-readiness";

export function wishProgress(wish: Wish, wishes: Wish[], demands: Demand[]) {
  const demand = demands.find((item) => item.wishIds.includes(wish.wishId));
  const count = wishes.filter((item) => item.status !== "WITHDRAWN" && item.genre === wish.genre && item.city === wish.city && item.preferredDate === wish.preferredDate).length;
  const stage = wish.status === "WITHDRAWN" ? "withdrawn" : !demand ? "collecting" : matchingReadiness(demand.matching).ready ? "ready" : "waiting";
  return { demand, count: demand?.wishCount ?? count, threshold: demand?.threshold ?? 10, stage };
}
