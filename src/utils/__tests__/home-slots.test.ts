import { defaultExperienceSettings } from "@breathly/stores/settings-state";
import type { Experience } from "@breathly/types/experience";
import {
  cycleSlot,
  getTimerRowCount,
  resolveBreathingSlot,
  resolveTimerSlots,
} from "@breathly/utils/home-slots";

const breathing = (id: string): Experience => ({ ...defaultExperienceSettings, id });
const timer = (id: string): Experience => ({
  ...defaultExperienceSettings,
  id,
  kind: "timer",
  name: id,
});
const unlocked = (id: string | null) => ({ id, locked: false });

describe("resolveBreathingSlot", () => {
  it("shows the picked breathing experience, with every breathing one to swipe to", () => {
    const experiences = [breathing("a"), timer("t"), breathing("b")];
    expect(resolveBreathingSlot(experiences, { id: "b", locked: true })).toEqual({
      id: "b",
      candidates: ["a", "b"],
      locked: true,
    });
  });

  it("falls back to the first one when the picked one is gone or is a timer", () => {
    const experiences = [timer("t"), breathing("a"), breathing("b")];
    expect(resolveBreathingSlot(experiences, unlocked("gone"))?.id).toBe("a");
    expect(resolveBreathingSlot(experiences, unlocked("t"))?.id).toBe("a");
    expect(resolveBreathingSlot(experiences, unlocked(null))?.id).toBe("a");
  });

  it("is empty without breathing experiences", () => {
    expect(resolveBreathingSlot([timer("t")], unlocked(null))).toBeNull();
  });
});

describe("resolveTimerSlots", () => {
  const timers = [breathing("a"), timer("t1"), timer("t2"), timer("t3")];

  it("shows no rows until a timer is saved, and none when turned off", () => {
    expect(resolveTimerSlots([breathing("a")], [], 1)).toEqual([]);
    expect(resolveTimerSlots(timers, [], 0)).toEqual([]);
  });

  it("shows as many rows as the setting allows, never more than there are timers", () => {
    expect(getTimerRowCount(1, 3)).toBe(1);
    expect(getTimerRowCount(5, 3)).toBe(3);
    expect(getTimerRowCount("all", 3)).toBe(3);
    expect(resolveTimerSlots(timers, [], 2).map((slot) => slot.id)).toEqual(["t1", "t2"]);
  });

  it("lets one row cycle through every timer when it is the only row", () => {
    const [row] = resolveTimerSlots(timers, [unlocked("t2")], 1);
    expect(row).toEqual({ id: "t2", candidates: ["t1", "t2", "t3"], locked: false });
  });

  it("never shows a timer in two rows, and a row cycles only through the ones not shown", () => {
    const rows = resolveTimerSlots(timers, [unlocked("t3"), unlocked("t3")], 2);
    expect(rows.map((slot) => slot.id)).toEqual(["t3", "t1"]);
    expect(rows[0]?.candidates).toEqual(["t2", "t3"]);
    expect(rows[1]?.candidates).toEqual(["t1", "t2"]);
  });

  it("keeps a row's pick even when a lower row has to fall back", () => {
    const rows = resolveTimerSlots(timers, [unlocked("gone"), unlocked("t1")], 2);
    expect(rows.map((slot) => slot.id)).toEqual(["t2", "t1"]);
  });

  it("keeps the lock of each row", () => {
    const rows = resolveTimerSlots(timers, [unlocked("t1"), { id: "t2", locked: true }], 2);
    expect(rows.map((slot) => slot.locked)).toEqual([false, true]);
  });
});

describe("cycleSlot", () => {
  it("moves to the next or previous one and wraps around", () => {
    expect(cycleSlot(["a", "b", "c"], "a", 1)).toBe("b");
    expect(cycleSlot(["a", "b", "c"], "a", -1)).toBe("c");
    expect(cycleSlot(["a", "b", "c"], "c", 1)).toBe("a");
    expect(cycleSlot(["a"], "a", 1)).toBe("a");
  });
});
