import { customPatternId } from "@breathly/types/experience";
import {
  adjustTimeLimit,
  adjustTimerDuration,
  adjustVolume,
  customPatternDurationLimits,
  defaultExperienceSettings,
  defaultSettingsState,
  maximumTimeLimitMs,
  maximumTimerDurationMs,
  mergePersistedSettingsState,
  migratePersistedSettingsState,
  normalizeExperiences,
  normalizePersistedSettingsState,
  setCustomPatternStepValue,
} from "../settings-state";

describe("settings state", () => {
  it("fills missing persisted values with current defaults", () => {
    expect(normalizePersistedSettingsState(undefined)).toEqual(defaultSettingsState);
    expect(normalizePersistedSettingsState({ theme: "light" })).toEqual({
      ...defaultSettingsState,
      theme: "light",
    });
  });

  it("starts with a five-minute 4-7-8 session and a fifteen-minute sauna timer", () => {
    const [breathing, sauna] = defaultSettingsState.experiences;
    expect(breathing).toMatchObject({
      id: "breathing",
      kind: "breathing",
      patternPresetId: "deep-calm",
      timeLimit: 5 * 60_000,
    });
    expect(sauna).toMatchObject({
      id: "sauna",
      kind: "timer",
      name: "Sauna timer",
      timerDurationMs: 15 * 60_000,
    });
  });

  it("preserves a complete valid settings record", () => {
    const validSettings = {
      ...defaultSettingsState,
      experiences: [
        {
          ...defaultExperienceSettings,
          id: "a",
          patternPresetId: customPatternId,
          customPatternSteps: [1_500, 0, 8_000, 3_500] as [number, number, number, number],
          voice: "bell" as const,
          timeLimit: 0,
          countdownNumbers: true,
          speakNumbers: true,
          softBeeps: true,
        },
        { ...defaultExperienceSettings, id: "b", kind: "timer" as const, name: "Tea" },
      ],
      shouldFollowSystemDarkMode: false,
      theme: "light" as const,
      vibrationEnabled: false,
      voiceVolume: 70,
      beepVolume: 20,
      voiceOtherAudio: "pause" as const,
      beepOtherAudio: "lower" as const,
    };

    expect(normalizePersistedSettingsState(validSettings)).toEqual(validSettings);
  });

  it("repairs invalid or malformed persisted values", () => {
    const normalized = normalizePersistedSettingsState({
      shouldFollowSystemDarkMode: null,
      theme: "sepia",
      vibrationEnabled: 1,
      voiceVolume: 400,
      beepVolume: Number.NaN,
      voiceOtherAudio: "loud",
    });

    expect(normalized).toEqual(defaultSettingsState);
  });

  it("repairs an experience and drops entries that cannot be one", () => {
    const experiences = normalizeExperiences([
      {
        id: "a",
        kind: "breathing",
        patternPresetId: "missing-preset",
        customPatternSteps: [-1, Number.NaN, 200_000, 3_000],
        voice: "missing-voice",
        timeLimit: Number.POSITIVE_INFINITY,
      },
      { id: "a", kind: "timer" },
      { kind: "timer", name: "No id" },
      "not an experience",
      { id: "t", kind: "timer", name: "  ", timerDurationMs: maximumTimerDurationMs * 2 },
    ]);

    expect(experiences).toEqual([
      {
        ...defaultExperienceSettings,
        id: "a",
        customPatternSteps: [
          customPatternDurationLimits[0]![0],
          defaultExperienceSettings.customPatternSteps[1],
          customPatternDurationLimits[2]![1],
          3_000,
        ],
      },
      {
        ...defaultExperienceSettings,
        id: "t",
        kind: "timer",
        name: "Timer",
        timerDurationMs: maximumTimerDurationMs,
      },
    ]);
  });

  it("keeps an empty list: the user may delete every card", () => {
    expect(normalizePersistedSettingsState({ experiences: [] }).experiences).toEqual([]);
  });

  it("keeps current store actions while merging normalized persisted data", () => {
    const action = jest.fn();
    const currentState = { ...defaultSettingsState, action };
    const mergedState = mergePersistedSettingsState(
      { theme: "light", voiceVolume: 101 },
      currentState,
    );

    expect(mergedState.action).toBe(action);
    expect(mergedState.theme).toBe("light");
    expect(mergedState.voiceVolume).toBe(100);
  });

  it("clamps every time, duration and volume adjustment inside the supported range", () => {
    expect(adjustTimeLimit(0, -60_000)).toBe(0);
    expect(adjustTimeLimit(maximumTimeLimitMs, 60_000)).toBe(maximumTimeLimitMs);
    expect(adjustTimerDuration(15 * 60_000, 60_000)).toBe(16 * 60_000);
    expect(adjustTimerDuration(60_000, -60_000)).toBe(60_000);
    expect(adjustTimerDuration(maximumTimerDurationMs, 60_000)).toBe(maximumTimerDurationMs);
    expect(adjustVolume(0, -10)).toBe(0);
    expect(adjustVolume(100, 10)).toBe(100);
  });

  it("clamps custom steps and ignores invalid indexes", () => {
    const steps = defaultExperienceSettings.customPatternSteps;
    expect(setCustomPatternStepValue(steps, 0, 0)[0]).toBe(customPatternDurationLimits[0]![0]);
    expect(setCustomPatternStepValue(steps, 4, 5_000)).toBe(steps);
  });
});

describe("settings migration", () => {
  it("turns the old session and sauna timer into the first two cards", () => {
    const migrated = migratePersistedSettingsState(
      {
        customPatternEnabled: false,
        selectedPatternPresetId: "square",
        guidedBreathingVoice: "laura",
        timeLimit: 10 * 60_000,
        saunaTimeLimit: 20 * 60_000,
        theme: "light",
      },
      1,
    );
    const { experiences, theme } = normalizePersistedSettingsState(migrated);

    expect(theme).toBe("light");
    expect(experiences).toEqual([
      {
        ...defaultExperienceSettings,
        id: "breathing",
        patternPresetId: "square",
        voice: "laura",
        timeLimit: 10 * 60_000,
      },
      expect.objectContaining({
        id: "sauna",
        kind: "timer",
        name: "Sauna timer",
        timerDurationMs: 20 * 60_000,
      }),
    ]);
  });

  it("carries a custom pattern over", () => {
    const migrated = migratePersistedSettingsState(
      { customPatternEnabled: true, customPatternSteps: [3_000, 1_000, 5_000, 0] },
      1,
    );
    const [breathing] = normalizePersistedSettingsState(migrated).experiences;

    expect(breathing).toMatchObject({
      patternPresetId: customPatternId,
      customPatternSteps: [3_000, 1_000, 5_000, 0],
    });
  });

  it("moves a version 0 user who kept the old defaults to five minutes of 4-7-8", () => {
    const migrated = migratePersistedSettingsState(
      { selectedPatternPresetId: "square", timeLimit: 120_000 },
      0,
    );
    const [breathing] = normalizePersistedSettingsState(migrated).experiences;

    expect(breathing).toMatchObject({ patternPresetId: "deep-calm", timeLimit: 300_000 });
  });

  it("leaves a current payload alone", () => {
    const current = { ...defaultSettingsState, experiences: [] };
    expect(migratePersistedSettingsState(current, 2)).toBe(current);
  });
});
