import {
  getSaunaRemainingMs,
  pauseSaunaTimer,
  resumeSaunaTimer,
  startSaunaTimer,
  useSaunaStore,
} from "../sauna";

describe("sauna timer", () => {
  it("counts down on the wall clock from its end time", () => {
    const timer = startSaunaTimer(1_000, 15 * 60_000);

    expect(getSaunaRemainingMs(timer, 1_000)).toBe(15 * 60_000);
    expect(getSaunaRemainingMs(timer, 61_000)).toBe(14 * 60_000);
    expect(getSaunaRemainingMs(timer, 10 * 60 * 60_000)).toBe(0);
    expect(getSaunaRemainingMs({ status: "idle" }, 1_000)).toBe(0);
  });

  it("finishes only a running timer", () => {
    const store = useSaunaStore.getState();

    store.finish();
    expect(useSaunaStore.getState().timer.status).toBe("idle");

    store.start(60_000);
    expect(useSaunaStore.getState().timer.status).toBe("running");
    store.finish();
    expect(useSaunaStore.getState().timer.status).toBe("finished");

    store.stop();
    expect(useSaunaStore.getState().timer.status).toBe("idle");
  });
});

describe("sauna timer pause", () => {
  it("keeps the remaining time while paused and counts on from it", () => {
    const running = startSaunaTimer(0, 15 * 60_000);
    const paused = pauseSaunaTimer(running, 5 * 60_000);

    expect(paused).toEqual({ status: "paused", remainingMs: 10 * 60_000 });
    // However long the pause lasts, the time left does not change.
    expect(getSaunaRemainingMs(paused, 60 * 60_000)).toBe(10 * 60_000);

    const resumed = resumeSaunaTimer(paused, 60 * 60_000);
    expect(getSaunaRemainingMs(resumed, 61 * 60_000)).toBe(9 * 60_000);
  });

  it("pauses only a running timer and resumes only a paused one", () => {
    expect(pauseSaunaTimer({ status: "idle" }, 0)).toEqual({ status: "idle" });
    const running = startSaunaTimer(0, 60_000);
    expect(resumeSaunaTimer(running, 30_000)).toBe(running);
  });
});
