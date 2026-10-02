import { getSaunaRemainingMs, startSaunaTimer, useSaunaStore } from "../sauna";

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
