import { getSessionNowMs } from "@breathly/screens/exercise-screen/exercise-session";

// The whole seconds of a step, counted down: a four-second inhale is 4, 3, 2, 1, one number a
// second from its start. A step that does not last a whole number of seconds shows its first
// number rounded up, and its last number for the part of a second that is left.
export const getStepSecondsRemaining = (durationMs: number): number[] => {
  const seconds: number[] = [];
  for (let offsetMs = 0; offsetMs < durationMs; offsetMs += 1000) {
    seconds.push(Math.ceil((durationMs - offsetMs) / 1000));
  }
  return seconds;
};

// Calls `onSecond` at the start of each second of a step, with the seconds left and the index
// of the second (0 at the step's start). Each second is timed from the step's start, not from
// the previous one, so late timers never add up. Returns the function that cancels the rest.
export const runStepSeconds = (
  durationMs: number,
  onSecond: (secondsRemaining: number, secondIndex: number) => void,
  now: () => number = getSessionNowMs,
) => {
  const seconds = getStepSecondsRemaining(durationMs);
  const startedAtMs = now();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const runSecond = (index: number) => {
    if (cancelled) return;
    const remaining = seconds[index];
    if (remaining === undefined) return;
    onSecond(remaining, index);
    const nextIndex = index + 1;
    if (nextIndex >= seconds.length) return;
    timeout = setTimeout(
      () => runSecond(nextIndex),
      Math.max(0, startedAtMs + nextIndex * 1000 - now()),
    );
  };

  runSecond(0);
  return () => {
    cancelled = true;
    clearTimeout(timeout);
  };
};
