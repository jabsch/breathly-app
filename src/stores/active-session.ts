import { create } from "zustand";
import {
  createExerciseSession,
  exerciseSessionReducer,
  type ExerciseSession,
  type ExerciseSessionAction,
} from "@breathly/screens/exercise-screen/exercise-session";
import { stopGuidedBreathingAudio } from "@breathly/services/audio";
import type { Experience } from "@breathly/types/experience";

// The one breathing session that can run at a time. It lives outside the exercise screen so
// the home screen can show and control it while the user swipes away from it: the session
// keeps running behind the home page, and its card pauses, resumes or stops it.
//
// `experience` is a copy taken when the session starts: editing the saved experience mid
// session changes the next run, not this one.
interface ActiveSessionStore {
  experience?: Experience;
  // Changes on every start, so starting the same experience again builds a fresh screen.
  runId: number;
  session: ExerciseSession;
  dispatch: (action: ExerciseSessionAction) => void;
  start: (experience: Experience) => void;
  pauseByUser: () => void;
  stop: () => void;
}

// The active time of the session, updated on every timer tick. Kept out of the store so the
// ticks don't re-render every subscriber; the home card polls it while it is visible.
let activeElapsedMs = 0;
export const getActiveElapsedMs = () => activeElapsedMs;
export const setActiveElapsedMs = (elapsedMs: number) => {
  activeElapsedMs = elapsedMs;
};

export const useActiveSessionStore = create<ActiveSessionStore>()((set, get) => ({
  experience: undefined,
  runId: 0,
  session: createExerciseSession(),
  dispatch: (action) => set({ session: exerciseSessionReducer(get().session, action) }),
  start: (experience) => {
    stopGuidedBreathingAudio();
    activeElapsedMs = 0;
    set({ experience, runId: get().runId + 1, session: createExerciseSession() });
  },
  pauseByUser: () => {
    stopGuidedBreathingAudio();
    set({
      session: exerciseSessionReducer(get().session, {
        type: "pause",
        activeElapsedMs,
        byUser: true,
      }),
    });
  },
  stop: () => {
    stopGuidedBreathingAudio();
    activeElapsedMs = 0;
    set({ experience: undefined, session: createExerciseSession() });
  },
}));
