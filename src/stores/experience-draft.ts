import { create } from "zustand";
import { defaultExperienceSettings } from "@breathly/stores/settings-state";
import type { Experience, ExperienceSettings } from "@breathly/types/experience";

// The experience being built or edited on the Create Experience screen. Nothing reaches the
// saved cards until the user taps Save Experience, so leaving the screen discards the changes.
interface ExperienceDraftStore {
  // The saved experience being edited, or undefined for a new one.
  editingId?: string;
  draft: ExperienceSettings;
  begin: (experience?: Experience) => void;
  update: (changes: Partial<ExperienceSettings>) => void;
}

export const useExperienceDraftStore = create<ExperienceDraftStore>()((set, get) => ({
  editingId: undefined,
  draft: defaultExperienceSettings,
  begin: (experience) => {
    if (!experience) {
      set({ editingId: undefined, draft: defaultExperienceSettings });
      return;
    }
    const { id, ...settings } = experience;
    set({ editingId: id, draft: settings });
  },
  update: (changes) => set({ draft: { ...get().draft, ...changes } }),
}));
