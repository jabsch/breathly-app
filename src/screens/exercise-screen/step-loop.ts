import { getSessionNowMs } from "@breathly/screens/exercise-screen/exercise-session";

// Runs the breathing steps on the clock, one timer per step, and calls `onStepStart` at the
// start of each one. The steps used to advance when the animation of the previous one ended,
// but Android runs no animation frames while the screen is off: the cues stopped with the
// screen. The animations are now only the picture of the clock.
//
// Each step ends at a time computed from the start of the session, not from the moment its
// timer fired, so the late firings of the timers never add up to a drift. A stall longer than
// a step (a busy JS thread) skips the steps it slept through: the cue that plays is always
// the one for the step the user is actually in.
export const loopSteps = (
  stepDurationsMs: number[],
  onStepStart: (stepIndex: number) => void,
  initialStepIndex = 0,
  now: () => number = getSessionNowMs,
) => {
  const cycleDurationMs = stepDurationsMs.reduce((total, duration) => total + duration, 0);
  if (stepDurationsMs.length === 0 || !(cycleDurationMs > 0)) return () => undefined;

  const stepDurationAt = (index: number) => stepDurationsMs[index] ?? 0;
  let stepIndex = Math.min(Math.max(initialStepIndex, 0), stepDurationsMs.length - 1);
  let stepStartedAtMs = now();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const scheduleStepEnd = () => {
    const stepEndsAtMs = stepStartedAtMs + stepDurationAt(stepIndex);
    timeout = setTimeout(startNextStep, Math.max(0, stepEndsAtMs - now()));
  };

  const startNextStep = () => {
    const nowMs = now();
    do {
      stepStartedAtMs += stepDurationAt(stepIndex);
      stepIndex = (stepIndex + 1) % stepDurationsMs.length;
    } while (stepStartedAtMs + stepDurationAt(stepIndex) <= nowMs);
    onStepStart(stepIndex);
    scheduleStepEnd();
  };

  onStepStart(stepIndex);
  scheduleStepEnd();
  return () => clearTimeout(timeout);
};
