import { describe, expect, it, vi } from "vitest";
import { RedisEventBus } from "../src/services/events/redis-event-bus";
import { MemoryEventBus, RegistryService, WishWorkflowService } from "../src";

describe("event service outage", () => {
  it("fails promptly and allows another connection attempt", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const bus = new RedisEventBus("redis://127.0.0.1:1");
    try {
      await expect(bus.readRecent(["wish.events"])).rejects.toThrow("EVENT_BUS_UNAVAILABLE");
      await expect(bus.readRecent(["wish.events"])).rejects.toThrow("EVENT_BUS_UNAVAILABLE");
    } finally {
      await bus.close();
      log.mockRestore();
    }
  }, 10000);

  it("does not leave a phantom wish when publishing fails", async () => {
    const eventBus = { publish: vi.fn().mockRejectedValue(new Error("EVENT_BUS_UNAVAILABLE")) };
    const service = new WishWorkflowService(new RegistryService(new MemoryEventBus()), eventBus);
    await expect(service.submitWish({
      userId: "test:outage", artistName: "Test", genre: "rock", city: "shanghai",
      date: "2099-01-01", depositAmount: 20
    })).rejects.toThrow("EVENT_BUS_UNAVAILABLE");
    expect(service.listWishes()).toHaveLength(0);
  });
});
