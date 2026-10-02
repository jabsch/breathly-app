import { Asset } from "expo-asset";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";
import { Platform } from "react-native";
import { sounds } from "@breathly/assets/sounds";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import { GuidedBreathingStep } from "@breathly/types/guided-breathing-step";

const configureAudioMode = () =>
  setAudioModeAsync({
    playsInSilentMode: true,
    // Android keeps the session running with the screen off (see `background-session`), and
    // expo-audio would otherwise pause every cue the moment the activity leaves the screen.
    shouldPlayInBackground: Platform.OS === "android",
    interruptionMode: Platform.OS === "android" ? "duckOthers" : "mixWithOthers",
  });

type GuidedBreathingAudioSounds = {
  [key in GuidedBreathingMode]: {
    [key in GuidedBreathingStep]: AudioSource | undefined;
  };
};

const guidedBreathingAudioAssets: GuidedBreathingAudioSounds = {
  laura: {
    breatheIn: sounds.lauraBreatheIn,
    breatheOut: sounds.lauraBreatheOut,
    hold: sounds.lauraHold,
  },
  paul: {
    breatheIn: sounds.paulBreatheIn,
    breatheOut: sounds.paulBreatheOut,
    hold: sounds.paulHold,
  },
  // The bell mode is used with the eyes closed, so the two directions must not sound the
  // same. Only the direction changes are cued: `buildStepsMetadata` gives the id `hold` to
  // both the step after the inhale and the step after the exhale, so any bell assigned to it
  // sounds twice per cycle and stops the sequence alternating. Silence during a hold is
  // unambiguous — the next bell says which way to breathe.
  bell: {
    breatheIn: sounds.cueBell1,
    breatheOut: sounds.cueBell2,
    hold: undefined,
  },
  disabled: {
    breatheIn: undefined,
    breatheOut: undefined,
    hold: undefined,
  },
};

// Partial: a mode may cue only some steps. Bell cues the two direction changes and leaves
// the holds silent; `disabled` cues nothing at all.
type CurrentGuidedBreathingSounds = {
  [key in GuidedBreathingStep]?: AudioPlayer;
};

let currentGuidedBreathingSounds: CurrentGuidedBreathingSounds | undefined;
let endingBellSound: AudioPlayer | undefined;
let audioOperation = Promise.resolve();
let requestedAudioGeneration = 0;

const enqueueAudioOperation = (operation: () => Promise<void>) => {
  const result = audioOperation.then(operation, operation);
  audioOperation = result.catch(() => undefined);
  return result;
};

const disposeCurrentAudio = async () => {
  const guidedBreathingSounds = currentGuidedBreathingSounds;
  const bellSound = endingBellSound;

  currentGuidedBreathingSounds = undefined;
  endingBellSound = undefined;

  bellSound?.remove();
  guidedBreathingSounds?.breatheIn?.remove();
  guidedBreathingSounds?.breatheOut?.remove();
  guidedBreathingSounds?.hold?.remove();
};

const prepareAudioSource = async (source: AudioSource): Promise<AudioSource> => {
  if (typeof source !== "number") return source;

  // Materialize bundled audio before creating the native player. This gives setup
  // an awaitable readiness boundary and avoids Android resource-URI loading races.
  const asset = Asset.fromModule(source);
  await asset.downloadAsync();

  return {
    assetId: source,
    uri: asset.localUri ?? asset.uri,
  };
};

const prepareOptionalAudioSource = async (
  source: AudioSource | undefined,
): Promise<AudioSource | undefined> => (source == null ? undefined : prepareAudioSource(source));

export function setupGuidedBreathingAudio(guidedBreathingMode: GuidedBreathingMode) {
  const audioGeneration = ++requestedAudioGeneration;
  const stepAudioSources = guidedBreathingAudioAssets[guidedBreathingMode];

  return enqueueAudioOperation(async () => {
    await disposeCurrentAudio();
    if (audioGeneration !== requestedAudioGeneration) return;

    await configureAudioMode();
    const [endingBellSource, breatheInSource, breatheOutSource, holdSource] = await Promise.all([
      prepareAudioSource(sounds.endingBell),
      prepareOptionalAudioSource(stepAudioSources.breatheIn),
      prepareOptionalAudioSource(stepAudioSources.breatheOut),
      prepareOptionalAudioSource(stepAudioSources.hold),
    ]);
    if (audioGeneration !== requestedAudioGeneration) return;

    endingBellSound = createAudioPlayer(endingBellSource);
    // Each cue is built on its own, so a mode can cue some steps and not others. A mode with
    // no cues at all (e.g. "disabled") keeps only the ending bell.
    const stepPlayers: CurrentGuidedBreathingSounds = {};
    if (breatheInSource != null) stepPlayers.breatheIn = createAudioPlayer(breatheInSource);
    if (breatheOutSource != null) stepPlayers.breatheOut = createAudioPlayer(breatheOutSource);
    if (holdSource != null) stepPlayers.hold = createAudioPlayer(holdSource);
    if (Object.keys(stepPlayers).length > 0) currentGuidedBreathingSounds = stepPlayers;
  });
}

export const releaseGuidedBreathingAudio = () => {
  requestedAudioGeneration++;
  return enqueueAudioOperation(disposeCurrentAudio);
};

export const stopGuidedBreathingAudio = () => {
  endingBellSound?.pause();
  currentGuidedBreathingSounds?.breatheIn?.pause();
  currentGuidedBreathingSounds?.breatheOut?.pause();
  currentGuidedBreathingSounds?.hold?.pause();
};

export const playGuidedBreathingSound = async (guidedBreathingStep: GuidedBreathingStep) => {
  const player = currentGuidedBreathingSounds?.[guidedBreathingStep];
  try {
    await player?.seekTo(0);
    if (player === currentGuidedBreathingSounds?.[guidedBreathingStep]) player?.play();
  } catch {
    // Audio cues are optional; keep the visual exercise running if a native player fails.
  }
};

export const playEndingBellSound = async () => {
  const player = endingBellSound;
  try {
    await player?.seekTo(0);
    if (player === endingBellSound) player?.play();
  } catch {
    // Completion must not fail because the optional ending bell could not play.
  }
};

// The sauna alarm has a player of its own: it rings whether or not a breathing session is
// running, and the session builds and releases its players as it comes and goes.
let saunaAlarmSound: AudioPlayer | undefined;

export const playSaunaAlarmSound = async () => {
  try {
    await configureAudioMode();
    saunaAlarmSound ??= createAudioPlayer(await prepareAudioSource(sounds.endingBell));
    await saunaAlarmSound.seekTo(0);
    saunaAlarmSound.play();
  } catch {
    // The vibration still marks the end of the sauna time.
  }
};
