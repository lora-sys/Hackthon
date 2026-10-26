import { describe, expect, it } from "vitest";
import type { Demand, Wish } from "@wishlive/shared";
import { wishProgress } from "./wish-progress";

const wish: Wish = { wishId: "w1", userId: "guest:1", artistName: "Band", genre: "rock", city: "shanghai", preferredDate: "2026-12-20", depositAmount: 20, status: "ACTIVE", createdAt: 1 };
const demand: Demand = { demandId: "d1", artistName: "Band", genre: "rock", city: "shanghai", preferredDate: "2026-12-20", wishCount: 10, threshold: 10, status: "MATCHED", wishIds: ["w1"], matching: { demandId: "d1", musicians: [], venues: [], createdAt: 1 }, createdAt: 1 };

describe("wish progress", () => {
  it("counts only the same cohort and excludes withdrawn wishes", () => {
    const others = [{ ...wish, wishId: "w2", preferredDate: "2026-12-21" }, { ...wish, wishId: "w3", status: "WITHDRAWN" as const }];
    expect(wishProgress(wish, [wish, ...others], []).count).toBe(1);
    expect(wishProgress(wish, [wish], []).stage).toBe("collecting");
  });
  it("does not confuse empty matching with candidates ready", () => {
    expect(wishProgress(wish, [wish], [demand]).stage).toBe("waiting");
    expect(wishProgress(wish, [wish], [demand]).count).toBe(10);
  });
  it("does not attach unrelated demands or reactivate withdrawn wishes", () => {
    expect(wishProgress(wish, [wish], [{ ...demand, wishIds: ["another"] }]).demand).toBeUndefined();
    expect(wishProgress({ ...wish, status: "WITHDRAWN" }, [], [demand]).stage).toBe("withdrawn");
  });
});
