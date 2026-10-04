import {
  getCountdownRemainingMs,
  pauseCountdown,
  resumeCountdown,
  startCountdown,
  useTimersStore,
} from "../timers";

describe("countdown timers", () => {
  it("counts down on the wall clock from its end time", () => {
    const timer = startCountdown(1_000, 15 * 60_000);

    expect(getCountdownRemainingMs(timer, 1_000)).toBe(15 * 60_000);
    expect(getCountdownRemainingMs(timer, 61_000)).toBe(14 * 60_000);
    expect(getCountdownRemainingMs(timer, 10 * 60 * 60_000)).toBe(0);
    expect(getCountdownRemainingMs({ status: "idle" }, 1_000)).toBe(0);
  });

  it("finishes only a running timer", () => {
    const store = useTimersStore.getState();

    store.finish("sauna");
    expect(useTimersStore.getState().timers.sauna).toBeUndefined();

    store.start("sauna", 60_000);
    expect(useTimersStore.getState().timers.sauna?.status).toBe("running");
    store.finish("sauna");
    expect(useTimersStore.getState().timers.sauna?.status).toBe("finished");

    store.stop("sauna");
    expect(useTimersStore.getState().timers.sauna).toBeUndefined();
  });

  it("runs any number of timers independently", () => {
    const store = useTimersStore.getState();

    store.start("sauna", 15 * 60_000);
    store.start("tea", 3 * 60_000);
    store.pause("tea");

    expect(useTimersStore.getState().timers.sauna?.status).toBe("running");
    expect(useTimersStore.getState().timers.tea?.status).toBe("paused");

    store.stop("sauna");
    expect(useTimersStore.getState().timers.sauna).toBeUndefined();
    expect(useTimersStore.getState().timers.tea?.status).toBe("paused");
    store.stop("tea");
  });
});

describe("countdown pause", () => {
  it("keeps the remaining time while paused and counts on from it", () => {
    const running = startCountdown(0, 15 * 60_000);
    const paused = pauseCountdown(running, 5 * 60_000);

    expect(paused).toEqual({ status: "paused", remainingMs: 10 * 60_000 });
    // However long the pause lasts, the time left does not change.
    expect(getCountdownRemainingMs(paused, 60 * 60_000)).toBe(10 * 60_000);

    const resumed = resumeCountdown(paused, 60 * 60_000);
    expect(getCountdownRemainingMs(resumed, 61 * 60_000)).toBe(9 * 60_000);
  });

  it("pauses only a running timer and resumes only a paused one", () => {
    expect(pauseCountdown({ status: "idle" }, 0)).toEqual({ status: "idle" });
    const running = startCountdown(0, 60_000);
    expect(resumeCountdown(running, 30_000)).toBe(running);
  });
});
