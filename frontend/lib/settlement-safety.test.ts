import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ deal: { status: "PENDING_CONFIRMATION" } }));
vi.mock("@wishlive/backend", () => ({
  getNegotiationService: () => ({ getDeal: () => state.deal }),
  NegotiationError: class extends Error {},
  RegistryError: class extends Error {},
  SettlementError: class extends Error {},
  WishWorkflowError: class extends Error {}
}));
import { POST } from "../app/api/show-confirm/[id]/confirm/route";

describe("settlement safety gate", () => {
  beforeEach(() => { state.deal.status = "PENDING_CONFIRMATION"; });
  it("does not fake success or change the deal on an unverified confirmation", async () => {
    const response = await POST(new Request("http://localhost/api/show-confirm/test/confirm", {
      method: "POST", body: JSON.stringify({ signature: "unverified" })
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "SETTLEMENT_NOT_READY" });
    expect(state.deal.status).toBe("PENDING_CONFIRMATION");
  });
  it("rejects confirmation from an already settled state", async () => {
    state.deal.status = "SETTLED";
    const response = await POST(new Request("http://localhost/api/show-confirm/test/confirm", {
      method: "POST", body: JSON.stringify({ signature: "unverified" })
    }), { params: Promise.resolve({ id: "test" }) });
    expect(response.status).toBe(409);
  });
});
