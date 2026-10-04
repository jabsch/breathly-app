import ms from "ms";
import { patternPresets } from "@breathly/assets/pattern-presets";
import {
  customPatternId,
  type Experience,
  type ExperienceKind,
  type ExperienceSettings,
} from "@breathly/types/experience";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import type { PatternSteps } from "@breathly/types/pattern-preset";

export type CustomPatternSteps = PatternSteps;
export type Theme = "dark" | "light";
// What other apps' audio (music, a podcast) does while a cue plays. Android only lets an app
// ask for one of these; how far "lower" goes is up to the system.
export type OtherAudioMode = "keep" | "lower" | "pause";

export interface PersistedSettingsState {
  experiences: Experience[];
  shouldFollowSystemDarkMode: boolean;
  theme: Theme;
  vibrationEnabled: boolean;
  // Percentages, in steps of `volumeStepPercent`.
  voiceVolume: number;
  beepVolume: number;
  voiceOtherAudio: OtherAudioMode;
  beepOtherAudio: OtherAudioMode;
}

// A tuple, not an array: `normalizeExperience` maps over this to build the four steps, so its
// length is what guarantees the result really has four of them.
export const customPatternDurationLimits: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [ms("1 sec"), ms("99 sec")],
  [0, ms("99 sec")],
  [ms("1 sec"), ms("99 sec")],
  [0, ms("99 sec")],
];
export const customPatternStepSizeMs = ms("0.5 sec");
export const timeLimitStepMs = ms("1 min");
export const maximumTimeLimitMs = ms("60 min");
export const minimumTimerDurationMs = ms("1 min");
export const maximumTimerDurationMs = ms("180 min");
export const volumeStepPercent = 10;
export const maximumExperienceNameLength = 40;

export const defaultExperienceSettings: ExperienceSettings = {
  kind: "breathing",
  name: "",
  patternPresetId: "deep-calm",
  customPatternSteps: [ms("4 sec"), ms("2 sec"), ms("4 sec"), ms("2 sec")],
  voice: "paul",
  timeLimit: ms("5 min"),
  countdownNumbers: false,
  speakNumbers: false,
  softBeeps: false,
  timerDurationMs: ms("15 min"),
};

// The ids of the two experiences every install starts with. The smoke tests find their cards
// by these ids, and the migration gives them to the session and the sauna timer it carries over.
export const defaultBreathingExperienceId = "breathing";
export const saunaExperienceId = "sauna";

export const defaultExperiences: Experience[] = [
  { ...defaultExperienceSettings, id: defaultBreathingExperienceId },
  {
    ...defaultExperienceSettings,
    id: saunaExperienceId,
    kind: "timer",
    name: "Sauna timer",
  },
];

export const defaultSettingsState: PersistedSettingsState = {
  experiences: defaultExperiences,
  // Dark by default; light stays one tap away in the settings.
  shouldFollowSystemDarkMode: false,
  theme: "dark",
  vibrationEnabled: true,
  voiceVolume: 100,
  // Soft: a tick every second should sit under the voice, not over it.
  beepVolume: 40,
  voiceOtherAudio: "lower",
  // Lowering the music once a second would pump it up and down all session.
  beepOtherAudio: "keep",
};

const guidedBreathingModes: GuidedBreathingMode[] = ["laura", "paul", "bell", "disabled"];
const otherAudioModes: OtherAudioMode[] = ["keep", "lower", "pause"];
const experienceKinds: ExperienceKind[] = ["breathing", "timer"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clampFiniteNumber = (value: unknown, minimum: number, maximum: number, fallback: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;

const booleanOr = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

export const setCustomPatternStepValue = (
  steps: CustomPatternSteps,
  stepIndex: number,
  stepValue: number,
): CustomPatternSteps => {
  const limits = customPatternDurationLimits[stepIndex];
  if (!limits) return steps;

  const nextSteps = [...steps] as CustomPatternSteps;
  nextSteps[stepIndex] = clampFiniteNumber(
    stepValue,
    limits[0],
    limits[1],
    defaultExperienceSettings.customPatternSteps[stepIndex] ?? limits[0],
  );
  return nextSteps;
};

export const adjustTimeLimit = (timeLimit: number, deltaMs: number) =>
  clampFiniteNumber(
    timeLimit + deltaMs,
    0,
    maximumTimeLimitMs,
    defaultExperienceSettings.timeLimit,
  );

export const adjustTimerDuration = (durationMs: number, deltaMs: number) =>
  clampFiniteNumber(
    durationMs + deltaMs,
    minimumTimerDurationMs,
    maximumTimerDurationMs,
    defaultExperienceSettings.timerDurationMs,
  );

export const adjustVolume = (volume: number, deltaPercent: number) =>
  clampFiniteNumber(volume + deltaPercent, 0, 100, 100);

const normalizeCustomPatternSteps = (value: unknown): CustomPatternSteps => {
  const candidateSteps = Array.isArray(value) ? value : [];
  return customPatternDurationLimits.map(([minimum, maximum], index) =>
    clampFiniteNumber(
      candidateSteps[index],
      minimum,
      maximum,
      defaultExperienceSettings.customPatternSteps[index] ?? minimum,
    ),
  ) as CustomPatternSteps;
};

const isKnownPatternId = (value: unknown) =>
  value === customPatternId || patternPresets.some((preset) => preset.id === value);

export const normalizeExperienceName = (value: unknown) =>
  typeof value === "string" ? value.trim().slice(0, maximumExperienceNameLength) : "";

export const normalizeExperienceSettings = (value: unknown): ExperienceSettings => {
  const candidate = isRecord(value) ? value : {};
  const defaults = defaultExperienceSettings;
  return {
    kind: oneOf(candidate.kind, experienceKinds, defaults.kind),
    name: normalizeExperienceName(candidate.name),
    patternPresetId: isKnownPatternId(candidate.patternPresetId)
      ? (candidate.patternPresetId as string)
      : defaults.patternPresetId,
    customPatternSteps: normalizeCustomPatternSteps(candidate.customPatternSteps),
    voice: oneOf(candidate.voice, guidedBreathingModes, defaults.voice),
    timeLimit: clampFiniteNumber(candidate.timeLimit, 0, maximumTimeLimitMs, defaults.timeLimit),
    countdownNumbers: booleanOr(candidate.countdownNumbers, defaults.countdownNumbers),
    speakNumbers: booleanOr(candidate.speakNumbers, defaults.speakNumbers),
    softBeeps: booleanOr(candidate.softBeeps, defaults.softBeeps),
    timerDurationMs: clampFiniteNumber(
      candidate.timerDurationMs,
      minimumTimerDurationMs,
      maximumTimerDurationMs,
      defaults.timerDurationMs,
    ),
  };
};

// A damaged entry is dropped rather than repaired into something the user never made. A timer
// without a name could not be told apart from the others, so it gets a generic one.
export const normalizeExperiences = (value: unknown): Experience[] => {
  if (!Array.isArray(value)) return defaultExperiences;
  const seenIds = new Set<string>();
  const experiences: Experience[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.id !== "string" || entry.id === "") continue;
    if (seenIds.has(entry.id)) continue;
    seenIds.add(entry.id);
    const settings = normalizeExperienceSettings(entry);
    experiences.push({
      ...settings,
      name: settings.kind === "timer" && settings.name === "" ? "Timer" : settings.name,
      id: entry.id,
    });
  }
  return experiences;
};

export const normalizePersistedSettingsState = (value: unknown): PersistedSettingsState => {
  const candidate = isRecord(value) ? value : {};
  const defaults = defaultSettingsState;
  return {
    experiences: normalizeExperiences(candidate.experiences),
    shouldFollowSystemDarkMode: booleanOr(
      candidate.shouldFollowSystemDarkMode,
      defaults.shouldFollowSystemDarkMode,
    ),
    theme: oneOf(candidate.theme, ["dark", "light"] as const, defaults.theme),
    vibrationEnabled: booleanOr(candidate.vibrationEnabled, defaults.vibrationEnabled),
    voiceVolume: clampFiniteNumber(candidate.voiceVolume, 0, 100, defaults.voiceVolume),
    beepVolume: clampFiniteNumber(candidate.beepVolume, 0, 100, defaults.beepVolume),
    voiceOtherAudio: oneOf(candidate.voiceOtherAudio, otherAudioModes, defaults.voiceOtherAudio),
    beepOtherAudio: oneOf(candidate.beepOtherAudio, otherAudioModes, defaults.beepOtherAudio),
  };
};

// Bumped whenever a stored payload needs `migratePersistedSettingsState`.
export const persistedSettingsVersion = 2;

// Version 1 made five minutes of 4-7-8 the default session, in place of two minutes of Square.
// A payload that still holds both of the old defaults never changed them, so it moves to the
// new ones; one that changed either keeps the user's choice.
const migrateToVersion1 = (persistedState: Record<string, unknown>) => {
  const keptOldDefaults =
    persistedState.customPatternEnabled !== true &&
    persistedState.selectedPatternPresetId === "square" &&
    persistedState.timeLimit === ms("2 min");
  if (!keptOldDefaults) return persistedState;
  return {
    ...persistedState,
    selectedPatternPresetId: defaultExperienceSettings.patternPresetId,
    timeLimit: defaultExperienceSettings.timeLimit,
  };
};

// Version 2 replaced the one session and the one sauna timer with saved experiences. The
// session the user had set up becomes the first card, and the sauna timer the second, with the
// pattern, voice and times they had chosen.
const migrateToVersion2 = (persistedState: Record<string, unknown>) => {
  if (Array.isArray(persistedState.experiences)) return persistedState;
  const breathing: Experience = {
    ...normalizeExperienceSettings({
      kind: "breathing",
      patternPresetId:
        persistedState.customPatternEnabled === true
          ? customPatternId
          : persistedState.selectedPatternPresetId,
      customPatternSteps: persistedState.customPatternSteps,
      voice: persistedState.guidedBreathingVoice,
      timeLimit: persistedState.timeLimit,
    }),
    id: defaultBreathingExperienceId,
  };
  const sauna: Experience = {
    ...normalizeExperienceSettings({
      ...breathing,
      kind: "timer",
      name: "Sauna timer",
      timerDurationMs: persistedState.saunaTimeLimit,
    }),
    id: saunaExperienceId,
  };
  return { ...persistedState, experiences: [breathing, sauna] };
};

export const migratePersistedSettingsState = (persistedState: unknown, version: number) => {
  if (!isRecord(persistedState)) return persistedState;
  let migrated = persistedState;
  if (version < 1) migrated = migrateToVersion1(migrated);
  if (version < 2) migrated = migrateToVersion2(migrated);
  return migrated;
};

export const mergePersistedSettingsState = <CurrentState extends PersistedSettingsState>(
  persistedState: unknown,
  currentState: CurrentState,
): CurrentState =>
  ({
    ...currentState,
    ...normalizePersistedSettingsState(persistedState),
  }) as CurrentState;
