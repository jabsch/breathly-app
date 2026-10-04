import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  persist,
  subscribeWithSelector,
  type PersistStorage,
  type StorageValue,
} from "zustand/middleware";
import {
  adjustTimeLimit,
  adjustTimerDuration,
  adjustVolume,
  defaultSettingsState,
  mergePersistedSettingsState,
  migratePersistedSettingsState,
  normalizeExperienceSettings,
  persistedSettingsVersion,
  timeLimitStepMs,
  type OtherAudioMode,
  type PersistedSettingsState,
  type Theme,
} from "@breathly/stores/settings-state";
import type { ExperienceSettings } from "@breathly/types/experience";
import { delay } from "@breathly/utils/delay";
import { createExperienceId } from "@breathly/utils/experience";

export type CueType = "voice" | "beep";

interface SettingsStore extends PersistedSettingsState {
  // Adds a new experience when `id` is undefined. Returns the id it was saved under.
  saveExperience: (id: string | undefined, settings: ExperienceSettings) => string;
  deleteExperience: (id: string) => unknown;
  // One step of the time on a card: the session length of a breathing experience, the
  // duration of a timer.
  adjustExperienceTime: (id: string, direction: 1 | -1) => unknown;
  setShouldFollowSystemDarkMode: (shouldFollowSystemDarkMode: boolean) => unknown;
  setTheme: (theme: Theme) => unknown;
  setVibrationEnabled: (vibrationEnabled: boolean) => unknown;
  adjustCueVolume: (cueType: CueType, deltaPercent: number) => unknown;
  setCueOtherAudio: (cueType: CueType, mode: OtherAudioMode) => unknown;
}

const readRetryDelayMs = 50;

// An unreadable or damaged payload must never stop hydration. Zustand leaves `hasHydrated`
// false when the read rejects, `useHydration` then never turns true, and the app renders an
// empty view on every launch — with no way back, because the app has no network. Both
// failures mean the same thing here: there are no usable stored settings. Report that, and
// let the store start from its defaults.
const settingsStorage: PersistStorage<SettingsStore> = {
  getItem: async (name) => {
    // Falling back to the defaults means the next settings change overwrites whatever is on
    // disk. A transient failure — a briefly locked database, say — would then cost the user
    // their real settings, so give the read a second chance, after a pause long enough for
    // the lock to clear. Back to back the retry would only survive a bridge hiccup.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await delay(readRetryDelayMs);
        const storedValue = await AsyncStorage.getItem(name);
        if (storedValue == null) return null;
        return JSON.parse(storedValue) as StorageValue<SettingsStore>;
      } catch (error) {
        // Damaged text will not parse on a retry either. Only a failed read is worth repeating.
        if (error instanceof SyntaxError) {
          console.warn("[settings] discarding a damaged settings payload", error);
          return null;
        }
        if (attempt === 1) {
          console.warn("[settings] could not read the stored settings", error);
          return null;
        }
      }
    }
    return null;
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value));
    } catch (error) {
      // A failed write costs the user one setting. Rejecting would only add an unhandled
      // rejection on top, and would not bring the value back. Leave a trace instead: the app
      // is offline, so a log is the only channel there is.
      console.warn("[settings] could not save the settings", error);
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.warn("[settings] could not clear the stored settings", error);
    }
  },
};

export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...defaultSettingsState,
        saveExperience: (id, settings) => {
          const savedId = id ?? createExperienceId();
          const saved = { ...normalizeExperienceSettings(settings), id: savedId };
          const experiences = get().experiences;
          set({
            experiences: experiences.some((experience) => experience.id === savedId)
              ? experiences.map((experience) => (experience.id === savedId ? saved : experience))
              : [...experiences, saved],
          });
          return savedId;
        },
        deleteExperience: (id) =>
          set({ experiences: get().experiences.filter((experience) => experience.id !== id) }),
        adjustExperienceTime: (id, direction) =>
          set({
            experiences: get().experiences.map((experience) => {
              if (experience.id !== id) return experience;
              return experience.kind === "timer"
                ? {
                    ...experience,
                    timerDurationMs: adjustTimerDuration(
                      experience.timerDurationMs,
                      direction * timeLimitStepMs,
                    ),
                  }
                : {
                    ...experience,
                    timeLimit: adjustTimeLimit(experience.timeLimit, direction * timeLimitStepMs),
                  };
            }),
          }),
        setShouldFollowSystemDarkMode: (shouldFollowSystemDarkMode) =>
          set({ shouldFollowSystemDarkMode }),
        setTheme: (theme) => set({ theme }),
        setVibrationEnabled: (vibrationEnabled) => set({ vibrationEnabled }),
        adjustCueVolume: (cueType, deltaPercent) =>
          cueType === "voice"
            ? set({ voiceVolume: adjustVolume(get().voiceVolume, deltaPercent) })
            : set({ beepVolume: adjustVolume(get().beepVolume, deltaPercent) }),
        setCueOtherAudio: (cueType, mode) =>
          cueType === "voice" ? set({ voiceOtherAudio: mode }) : set({ beepOtherAudio: mode }),
      }),
      {
        name: "settings-storage",
        storage: settingsStorage,
        version: persistedSettingsVersion,
        migrate: (persistedState, version) =>
          migratePersistedSettingsState(persistedState, version) as SettingsStore,
        merge: mergePersistedSettingsState,
      },
    ),
  ),
);

export const useExperience = (id: string | undefined) =>
  useSettingsStore((state) => state.experiences.find((experience) => experience.id === id));

// https://github.com/pmndrs/zustand/blob/725c2c0cc08df936f42a52e3df3dec76780a6e01/docs/integrations/persisting-store-data.md
export const useHydration = () => {
  const [hydrated, setHydrated] = useState(useSettingsStore.persist.hasHydrated);

  useEffect(() => {
    const unsubFinishHydration = useSettingsStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    setHydrated(useSettingsStore.persist.hasHydrated());
    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
};
