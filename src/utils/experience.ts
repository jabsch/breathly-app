import ms from "ms";
import { patternPresets } from "@breathly/assets/pattern-presets";
import { customPatternId, type ExperienceSettings } from "@breathly/types/experience";
import type { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import type { PatternSteps } from "@breathly/types/pattern-preset";

export const noPatternLabel = "No Pattern: Custom Timer";

export const getExperiencePatternSteps = (experience: ExperienceSettings): PatternSteps =>
  experience.patternPresetId === customPatternId
    ? experience.customPatternSteps
    : (patternPresets.find((preset) => preset.id === experience.patternPresetId)?.steps ??
      patternPresets[0].steps);

export const getExperiencePatternName = (experience: ExperienceSettings) => {
  if (experience.kind === "timer") return noPatternLabel;
  if (experience.patternPresetId === customPatternId) return "Custom";
  return (
    patternPresets.find((preset) => preset.id === experience.patternPresetId)?.name ??
    patternPresets[0].name
  );
};

export const formatPatternSteps = (steps: PatternSteps) =>
  steps.map((duration) => duration / ms("1 sec")).join("-");

export const getExperienceDisplayName = (experience: ExperienceSettings) =>
  experience.name !== "" ? experience.name : getExperiencePatternName(experience);

export const voiceLabels: Record<GuidedBreathingMode, string> = {
  laura: "Laura",
  paul: "Paul",
  bell: "Bell",
  disabled: "No voice",
};

export const createExperienceId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
