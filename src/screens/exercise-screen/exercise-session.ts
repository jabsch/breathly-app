import type { StepId } from "@breathly/types/step-metadata";

export type ResumableExerciseStatus = "interlude" | "running";
export type ExerciseStatus = ResumableExerciseStatus | "paused" | "completed";

export interface ExerciseSession {
  status: ExerciseStatus;
  resumeStatus?: ResumableExerciseStatus;
  // True when the user paused, false when the app went to the background.
  pausedByUser?: boolean;
  activeElapsedMs: number;
  currentStepIndex: number;
}

export type ExerciseSessionAction =
  | { type: "start" }
  | { type: "pause"; activeElapsedMs: number; byUser?: boolean }
  | { type: "resume" }
  | { type: "complete"; activeElapsedMs: number }
  | { type: "stepChanged"; stepIndex: number };

export const createExerciseSession = (): ExerciseSession => ({
  status: "interlude",
  activeElapsedMs: 0,
  currentStepIndex: 0,
});

export const getSessionNowMs = () => globalThis.performance?.now() ?? Date.now();

// The exercise keeps running while the app is inactive (the Control Center, the
// app switcher or a call banner), thus the clock must keep counting there too.
// Only a real background stops both.
//
// A gap that is longer than the maximum comes from a stall of the JavaScript
// thread or from a suspension that the app state did not report. The maximum
// limits the error of such a gap, but the gap must not be discarded: a slow
// device stalls many times, and each discarded gap makes the session run past
// the time limit that the user selected.
export const getActiveTickDeltaMs = (
  previousTickAtMs: number,
  currentTickAtMs: number,
  appIsForeground: boolean,
  maximumActiveTickGapMs: number,
) => {
  const tickDeltaMs = currentTickAtMs - previousTickAtMs;
  if (!appIsForeground || tickDeltaMs < 0) return 0;
  return Math.min(tickDeltaMs, maximumActiveTickGapMs);
};

export type ExerciseStepTransition = "none" | "startStep" | "complete";

// The exercise must not stop while the lungs are full: the user would then hold
// the breath while the completion screen appears. These two steps end with empty
// lungs, thus they are the only safe points at which the exercise can stop.
const endsWithEmptyLungs = (stepId: StepId | undefined) =>
  stepId === "exhale" || stepId === "afterExhale";

// The time limit usually occurs in the middle of a step. The exercise then
// continues to the first step boundary that leaves the lungs empty, and it stops
// there. This adds at most one inhale, one hold and one exhale to the session.
export const getExerciseStepTransition = (
  previousStepId: StepId | undefined,
  currentStepId: StepId,
  timeLimitReached: boolean,
): ExerciseStepTransition => {
  if (previousStepId === currentStepId) return "none";
  if (timeLimitReached && endsWithEmptyLungs(previousStepId)) return "complete";
  return "startStep";
};

export const exerciseSessionReducer = (
  session: ExerciseSession,
  action: ExerciseSessionAction,
): ExerciseSession => {
  switch (action.type) {
    case "start":
      if (session.status !== "interlude") return session;
      return {
        ...session,
        status: "running",
      };
    case "pause":
      if (session.status === "interlude") {
        return {
          ...session,
          status: "paused",
          resumeStatus: "interlude",
          pausedByUser: action.byUser ?? false,
        };
      }
      if (session.status !== "running") return session;
      return {
        ...session,
        status: "paused",
        resumeStatus: "running",
        pausedByUser: action.byUser ?? false,
        activeElapsedMs: Math.max(session.activeElapsedMs, action.activeElapsedMs),
      };
    case "resume":
      if (session.status !== "paused" || session.resumeStatus == null) return session;
      if (session.resumeStatus === "interlude") {
        return {
          ...session,
          status: "interlude",
          resumeStatus: undefined,
          pausedByUser: undefined,
        };
      }
      return {
        ...session,
        status: "running",
        resumeStatus: undefined,
        pausedByUser: undefined,
      };
    case "complete":
      if (session.status !== "running") return session;
      return {
        ...session,
        status: "completed",
        activeElapsedMs: Math.max(session.activeElapsedMs, action.activeElapsedMs),
      };
    case "stepChanged":
      if (session.status !== "running" || action.stepIndex < 0) return session;
      return {
        ...session,
        currentStepIndex: action.stepIndex,
      };
  }
};
