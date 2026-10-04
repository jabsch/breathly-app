import { create } from "zustand";

// Timer experiences ("No Pattern: Custom Timer", the sauna timer among them) run on their own,
// next to each other and next to (or without) a breathing session: each one starts, pauses and
// stops independently, so their state lives outside every screen, keyed by experience id. It is
// not persisted: a timer that outlived the app process could not ring anyway.
//
// It counts on the wall clock, from the moment it ends rather than from ticks: a late or
// skipped tick then never costs the user time, and the countdown is right again the
// moment the screen turns back on.
export type CountdownTimer =
  | { status: "idle" }
  | { status: "running"; endsAtMs: number }
  | { status: "paused"; remainingMs: number }
  | { status: "finished"; finishedAtMs: number };

export const startCountdown = (nowMs: number, durationMs: number): CountdownTimer => ({
  status: "running",
  endsAtMs: nowMs + durationMs,
});

export const pauseCountdown = (timer: CountdownTimer, nowMs: number): CountdownTimer =>
  timer.status === "running"
    ? { status: "paused", remainingMs: Math.max(0, timer.endsAtMs - nowMs) }
    : timer;

export const resumeCountdown = (timer: CountdownTimer, nowMs: number): CountdownTimer =>
  timer.status === "paused" ? startCountdown(nowMs, timer.remainingMs) : timer;

export const getCountdownRemainingMs = (timer: CountdownTimer, nowMs: number) => {
  if (timer.status === "running") return Math.max(0, timer.endsAtMs - nowMs);
  if (timer.status === "paused") return timer.remainingMs;
  return 0;
};

const idleTimer: CountdownTimer = { status: "idle" };

interface TimersStore {
  timers: Record<string, CountdownTimer>;
  start: (id: string, durationMs: number) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  stop: (id: string) => void;
  finish: (id: string) => void;
}

export const useTimersStore = create<TimersStore>()((set, get) => {
  const update = (id: string, timer: CountdownTimer) =>
    set({ timers: { ...get().timers, [id]: timer } });
  const timerOf = (id: string) => get().timers[id] ?? idleTimer;
  return {
    timers: {},
    start: (id, durationMs) => update(id, startCountdown(Date.now(), durationMs)),
    pause: (id) => update(id, pauseCountdown(timerOf(id), Date.now())),
    resume: (id) => update(id, resumeCountdown(timerOf(id), Date.now())),
    stop: (id) => {
      const { [id]: _stopped, ...others } = get().timers;
      set({ timers: others });
    },
    finish: (id) => {
      if (timerOf(id).status !== "running") return;
      update(id, { status: "finished", finishedAtMs: Date.now() });
    },
  };
});

export const useTimer = (id: string) => useTimersStore((state) => state.timers[id] ?? idleTimer);
