import { create } from "zustand";

// The sauna timer runs on its own, next to (or without) a breathing session, so its state
// lives outside both screens. It is not persisted: a timer that outlived the app process
// could not ring anyway.
//
// It counts on the wall clock, from the moment it ends rather than from ticks: a late or
// skipped tick then never costs the user sauna time, and the countdown is right again the
// moment the screen turns back on.
export type SaunaTimer =
  | { status: "idle" }
  | { status: "running"; endsAtMs: number }
  | { status: "finished"; finishedAtMs: number };

export const startSaunaTimer = (nowMs: number, durationMs: number): SaunaTimer => ({
  status: "running",
  endsAtMs: nowMs + durationMs,
});

export const getSaunaRemainingMs = (timer: SaunaTimer, nowMs: number) =>
  timer.status === "running" ? Math.max(0, timer.endsAtMs - nowMs) : 0;

interface SaunaStore {
  timer: SaunaTimer;
  start: (durationMs: number) => void;
  stop: () => void;
  finish: () => void;
}

export const useSaunaStore = create<SaunaStore>()((set, get) => ({
  timer: { status: "idle" },
  start: (durationMs) => set({ timer: startSaunaTimer(Date.now(), durationMs) }),
  stop: () => set({ timer: { status: "idle" } }),
  finish: () => {
    if (get().timer.status !== "running") return;
    set({ timer: { status: "finished", finishedAtMs: Date.now() } });
  },
}));
