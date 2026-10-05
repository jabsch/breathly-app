import type { HomeSlot, TimerRowsSetting } from "@breathly/stores/settings-state";
import type { Experience } from "@breathly/types/experience";

// What one place on the home page shows: the experience, the ones a swipe cycles through (it
// included, in the saved order), and whether swiping is locked.
export interface ResolvedSlot {
  id: string;
  candidates: string[];
  locked: boolean;
}

const idsOfKind = (experiences: Experience[], kind: Experience["kind"]) =>
  experiences.filter((experience) => experience.kind === kind).map((experience) => experience.id);

// The breathing section shows one breathing experience: the one picked last, or the first one
// when that was deleted. Every breathing experience is a swipe away.
export const resolveBreathingSlot = (
  experiences: Experience[],
  slot: HomeSlot,
): ResolvedSlot | null => {
  const candidates = idsOfKind(experiences, "breathing");
  if (candidates.length === 0) return null;
  const id = slot.id != null && candidates.includes(slot.id) ? slot.id : (candidates[0] as string);
  return { id, candidates, locked: slot.locked };
};

export const getTimerRowCount = (setting: TimerRowsSetting, timerCount: number) =>
  Math.min(setting === "all" ? timerCount : setting, timerCount);

// The timer rows, from the one right above the breathing section up. No two rows show the same
// timer: each row keeps the timer picked for it while that one still exists and no lower row
// took it, and otherwise gets the first timer no row shows. A swipe on a row cycles through its
// own timer and the ones no other row shows.
export const resolveTimerSlots = (
  experiences: Experience[],
  slots: HomeSlot[],
  setting: TimerRowsSetting,
): ResolvedSlot[] => {
  const timers = idsOfKind(experiences, "timer");
  const rowCount = getTimerRowCount(setting, timers.length);
  // Rows keep the timers picked for them first, so a row that falls back never takes the
  // timer another row was set to.
  const shown: (string | null)[] = [];
  for (let row = 0; row < rowCount; row++) {
    const picked = slots[row]?.id;
    shown.push(
      picked != null && timers.includes(picked) && !shown.includes(picked) ? picked : null,
    );
  }
  for (let row = 0; row < rowCount; row++) {
    if (shown[row] == null) shown[row] = timers.find((id) => !shown.includes(id)) ?? null;
  }
  return (shown as string[]).map((id, row) => ({
    id,
    candidates: timers.filter((timer) => timer === id || !shown.includes(timer)),
    locked: slots[row]?.locked ?? false,
  }));
};

// The experience a swipe brings in: `direction` 1 is the next one, -1 the previous one, and
// both wrap around.
export const cycleSlot = (candidates: string[], id: string, direction: 1 | -1): string => {
  if (candidates.length === 0) return id;
  const index = Math.max(0, candidates.indexOf(id));
  return candidates[(index + direction + candidates.length) % candidates.length] ?? id;
};
