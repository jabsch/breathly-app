import type { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import type { PatternSteps } from "@breathly/types/pattern-preset";

// A breathing experience runs a pattern on the exercise screen, one at a time. A timer
// experience is a plain countdown ("No Pattern: Custom Timer"), and any number of them run
// at once, next to each other and next to a breathing session.
export type ExperienceKind = "breathing" | "timer";

// The id of the custom pattern, in place of a preset id.
export const customPatternId = "custom";

// One flat record for both kinds, so editing an experience from one kind to the other and back
// keeps what was set before.
export interface ExperienceSettings {
  kind: ExperienceKind;
  // Empty for a breathing experience means "use the pattern's name". A timer needs one.
  name: string;
  patternPresetId: string;
  customPatternSteps: PatternSteps;
  voice: GuidedBreathingMode;
  // Zero means no limit.
  timeLimit: number;
  countdownNumbers: boolean;
  speakNumbers: boolean;
  softBeeps: boolean;
  timerDurationMs: number;
}

export interface Experience extends ExperienceSettings {
  id: string;
}
