import { create } from "zustand";

// The sauna timer runs on its own, next to (or without) a breathing session: it starts,
// pauses and stops independently of it, so its state lives outside both screens. It is not
// persisted: a timer that outlived the app process could not ring anyway.
//
// It counts on the wall clock, from the moment it ends rather than from ticks: a late or
// skipped tick then never costs the user sauna time, and the countdown is right again the
// moment the screen turns back on.
export type SaunaTimer =
  | { status: "idle" }
  | { status: "running"; endsAtMs: number }
  | { status: "paused"; remainingMs: number }
  | { status: "finished"; finishedAtMs: number };

export const startSaunaTimer = (nowMs: number, durationMs: number): SaunaTimer => ({
  status: "running",
  endsAtMs: nowMs + durationMs,
});

export const pauseSaunaTimer = (timer: SaunaTimer, nowMs: number): SaunaTimer =>
  timer.status === "running"
    ? { status: "paused", remainingMs: Math.max(0, timer.endsAtMs - nowMs) }
    : timer;

export const resumeSaunaTimer = (timer: SaunaTimer, nowMs: number): SaunaTimer =>
  timer.status === "paused" ? startSaunaTimer(nowMs, timer.remainingMs) : timer;

export const getSaunaRemainingMs = (timer: SaunaTimer, nowMs: number) => {
  if (timer.status === "running") return Math.max(0, timer.endsAtMs - nowMs);
  if (timer.status === "paused") return timer.remainingMs;
  return 0;
};

interface SaunaStore {
  timer: SaunaTimer;
  start: (durationMs: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  finish: () => void;
}

export const useSaunaStore = create<SaunaStore>()((set, get) => ({
  timer: { status: "idle" },
  start: (durationMs) => set({ timer: startSaunaTimer(Date.now(), durationMs) }),
  pause: () => set({ timer: pauseSaunaTimer(get().timer, Date.now()) }),
  resume: () => set({ timer: resumeSaunaTimer(get().timer, Date.now()) }),
  stop: () => set({ timer: { status: "idle" } }),
  finish: () => {
    if (get().timer.status !== "running") return;
    set({ timer: { status: "finished", finishedAtMs: Date.now() } });
  },
}));
