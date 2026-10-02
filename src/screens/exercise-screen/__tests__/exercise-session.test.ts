import {
  createExerciseSession,
  exerciseSessionReducer,
  getActiveTickDeltaMs,
  getExerciseStepTransition,
} from "../exercise-session";

describe("exercise session lifecycle", () => {
  it("starts the active clock only after the interlude", () => {
    const initial = createExerciseSession();
    const running = exerciseSessionReducer(initial, { type: "start" });

    expect(initial.status).toBe("interlude");
    expect(running).toMatchObject({ status: "running", activeElapsedMs: 0 });
  });

  it("pauses at the last elapsed value confirmed by the active timer", () => {
    const running = exerciseSessionReducer(createExerciseSession(), { type: "start" });
    const paused = exerciseSessionReducer(running, {
      type: "pause",
      activeElapsedMs: 5_000,
    });
    const resumed = exerciseSessionReducer(paused, { type: "resume" });

    expect(paused).toMatchObject({
      status: "paused",
      resumeStatus: "running",
      activeElapsedMs: 5_000,
    });
    expect(resumed).toMatchObject({ status: "running", activeElapsedMs: 5_000 });
  });

  it("remembers that the user paused, until the session resumes", () => {
    const running = exerciseSessionReducer(createExerciseSession(), { type: "start" });
    const paused = exerciseSessionReducer(running, {
      type: "pause",
      activeElapsedMs: 5_000,
      byUser: true,
    });
    const resumed = exerciseSessionReducer(paused, { type: "resume" });

    expect(paused).toMatchObject({ status: "paused", pausedByUser: true });
    expect(resumed.pausedByUser).toBeUndefined();
    expect(
      exerciseSessionReducer(running, { type: "pause", activeElapsedMs: 0 }).pausedByUser,
    ).toBe(false);
  });

  it("counts normal heartbeats of the foreground", () => {
    expect(getActiveTickDeltaMs(1_000, 1_250, true, 1_000)).toBe(250);
    expect(getActiveTickDeltaMs(1_000, 2_000, true, 1_000)).toBe(1_000);
  });

  it("counts no time in the background and no time that goes backwards", () => {
    expect(getActiveTickDeltaMs(1_000, 1_250, false, 1_000)).toBe(0);
    expect(getActiveTickDeltaMs(2_000, 1_000, true, 1_000)).toBe(0);
  });

  // A gap longer than the maximum comes from a stall of the JavaScript thread.
  // The time of the stall must not disappear from the session: a slow device
  // stalls many times, and the session then runs past the selected time limit.
  it("limits a long gap but keeps the time that it can confirm", () => {
    expect(getActiveTickDeltaMs(1_000, 11_000, true, 1_000)).toBe(1_000);
    expect(getActiveTickDeltaMs(1_000, 1_001_000, true, 1_000)).toBe(1_000);
  });

  // A discarded gap counts 750 ms of these 8_750 ms, thus the session of the
  // user runs 8 seconds longer than the selected time limit.
  it("counts the limited part of every stall instead of nothing", () => {
    const maximumGapMs = 1_000;
    const stallsMs = [250, 3_000, 250, 5_000, 250];
    let clockMs = 0;
    let elapsedMs = 0;

    stallsMs.forEach((stallMs) => {
      elapsedMs += getActiveTickDeltaMs(clockMs, clockMs + stallMs, true, maximumGapMs);
      clockMs += stallMs;
    });

    expect(clockMs).toBe(8_750);
    expect(elapsedMs).toBe(2_750);
  });

  it("restarts the interlude when it was interrupted before the exercise began", () => {
    const paused = exerciseSessionReducer(createExerciseSession(), {
      type: "pause",
      activeElapsedMs: 0,
    });
    const resumed = exerciseSessionReducer(paused, { type: "resume" });

    expect(paused).toMatchObject({ status: "paused", resumeStatus: "interlude" });
    expect(resumed).toMatchObject({ status: "interlude", activeElapsedMs: 0 });
  });

  it("preserves the current breathing step while paused", () => {
    const running = exerciseSessionReducer(createExerciseSession(), { type: "start" });
    const onExhale = exerciseSessionReducer(running, { type: "stepChanged", stepIndex: 2 });
    const paused = exerciseSessionReducer(onExhale, {
      type: "pause",
      activeElapsedMs: 1_000,
    });
    const resumed = exerciseSessionReducer(paused, { type: "resume" });

    expect(resumed.currentStepIndex).toBe(2);
  });

  it("freezes elapsed time when the session completes", () => {
    const running = exerciseSessionReducer(createExerciseSession(), { type: "start" });
    const completed = exerciseSessionReducer(running, {
      type: "complete",
      activeElapsedMs: 10_000,
    });

    expect(completed).toMatchObject({ status: "completed", activeElapsedMs: 10_000 });
  });

  it("ignores invalid transitions", () => {
    const initial = createExerciseSession();
    const invalidResume = exerciseSessionReducer(initial, { type: "resume" });

    expect(invalidResume).toBe(initial);
  });
});

describe("exercise step transitions", () => {
  it("announces the first step of the exercise", () => {
    expect(getExerciseStepTransition(undefined, "inhale", false)).toBe("startStep");
  });

  it("does nothing when the loop repeats the same step", () => {
    expect(getExerciseStepTransition("exhale", "exhale", false)).toBe("none");
    expect(getExerciseStepTransition("exhale", "exhale", true)).toBe("none");
  });

  it("announces every step while the time limit is not reached", () => {
    expect(getExerciseStepTransition("inhale", "afterInhale", false)).toBe("startStep");
    expect(getExerciseStepTransition("afterInhale", "exhale", false)).toBe("startStep");
    expect(getExerciseStepTransition("exhale", "afterExhale", false)).toBe("startStep");
    expect(getExerciseStepTransition("afterExhale", "inhale", false)).toBe("startStep");
  });

  it("stops the exercise at the end of the exhale after the time limit", () => {
    expect(getExerciseStepTransition("exhale", "afterExhale", true)).toBe("complete");
    expect(getExerciseStepTransition("exhale", "inhale", true)).toBe("complete");
  });

  it("stops the exercise at the end of the hold that follows the exhale", () => {
    expect(getExerciseStepTransition("afterExhale", "inhale", true)).toBe("complete");
  });

  it("keeps breathing after the time limit until the lungs are empty", () => {
    expect(getExerciseStepTransition("inhale", "afterInhale", true)).toBe("startStep");
    expect(getExerciseStepTransition("inhale", "exhale", true)).toBe("startStep");
    expect(getExerciseStepTransition("afterInhale", "exhale", true)).toBe("startStep");
  });
});
