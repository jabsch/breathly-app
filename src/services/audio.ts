import { Asset } from "expo-asset";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
} from "expo-audio";
import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { sounds } from "@breathly/assets/sounds";
import { useSettingsStore, type CueType } from "@breathly/stores/settings";
import type { OtherAudioMode } from "@breathly/stores/settings-state";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import { GuidedBreathingStep } from "@breathly/types/guided-breathing-step";

const interruptionModes = {
  keep: "mixWithOthers",
  lower: "duckOthers",
  pause: "doNotMix",
} as const;

// The settings are read at play time, so a change applies from the next cue on. The beeps have
// no app-wide volume: each experience sets its own, passed in with the beep.
const cueLevels = (cueType: CueType) => {
  const state = useSettingsStore.getState();
  return cueType === "voice"
    ? { volume: state.voiceVolume / 100, otherAudio: state.voiceOtherAudio }
    : { volume: 1, otherAudio: state.beepOtherAudio };
};

// expo-audio asks Android for audio focus when a cue starts and gives it back when nothing
// plays, using the mode set last. Setting the mode before each kind of cue is what lets the
// voice lower the music while the beeps leave it alone. A cue that starts while another still
// holds focus shares that one's mode.
let configuredOtherAudio: OtherAudioMode | undefined;
const configureAudioMode = async (otherAudio: OtherAudioMode = cueLevels("voice").otherAudio) => {
  if (configuredOtherAudio === otherAudio) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    // Android keeps the session running with the screen off (see `background-session`), and
    // expo-audio would otherwise pause every cue the moment the activity leaves the screen.
    shouldPlayInBackground: Platform.OS === "android",
    // iOS mixes in every mode: the session there pauses in the background anyway.
    interruptionMode: Platform.OS === "android" ? interruptionModes[otherAudio] : "mixWithOthers",
  });
  configuredOtherAudio = otherAudio;
};

const playFromStart = async (
  player: AudioPlayer,
  cueType: CueType,
  stillCurrent: () => boolean = () => true,
  volumeOverride?: number,
) => {
  const { volume, otherAudio } = cueLevels(cueType);
  await configureAudioMode(otherAudio);
  await player.seekTo(0);
  if (!stillCurrent()) return;
  player.volume = volumeOverride ?? volume;
  player.play();
};

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

    configuredOtherAudio = undefined;
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
  void Speech.stop().catch(() => undefined);
  endingBellSound?.pause();
  currentGuidedBreathingSounds?.breatheIn?.pause();
  currentGuidedBreathingSounds?.breatheOut?.pause();
  currentGuidedBreathingSounds?.hold?.pause();
};

export const playGuidedBreathingSound = async (guidedBreathingStep: GuidedBreathingStep) => {
  const player = currentGuidedBreathingSounds?.[guidedBreathingStep];
  if (!player) return;
  try {
    await playFromStart(
      player,
      "voice",
      () => player === currentGuidedBreathingSounds?.[guidedBreathingStep],
    );
  } catch {
    // Audio cues are optional; keep the visual exercise running if a native player fails.
  }
};

export const playEndingBellSound = async () => {
  const player = endingBellSound;
  if (!player) return;
  try {
    await playFromStart(player, "voice", () => player === endingBellSound);
  } catch {
    // Completion must not fail because the optional ending bell could not play.
  }
};

// The timer alarm has a player of its own: it rings whether or not a breathing session is
// running, and the session builds and releases its players as it comes and goes. It always
// rings at full volume and lowers other audio: it is an alarm, not a cue.
let timerAlarmSound: AudioPlayer | undefined;

export const playTimerAlarmSound = async () => {
  try {
    await configureAudioMode("lower");
    timerAlarmSound ??= createAudioPlayer(await prepareAudioSource(sounds.endingBell));
    await timerAlarmSound.seekTo(0);
    timerAlarmSound.volume = 1;
    timerAlarmSound.play();
  } catch {
    // The vibration still marks the end of the time.
  }
};

// The soft beep once a second has a player of its own too, built on first use and kept: a
// player per beep would allocate sixty native players a minute.
let softBeepSound: AudioPlayer | undefined;

// `volumePercent` is the experience's beep volume.
export const playSoftBeep = async (volumePercent: number) => {
  try {
    softBeepSound ??= createAudioPlayer(await prepareAudioSource(sounds.softBeep));
    await playFromStart(softBeepSound, "beep", undefined, volumePercent / 100);
  } catch {
    // The beeps are optional; the session goes on without them.
  }
};

// The counted numbers come from the phone's text-to-speech engine: the recorded voices only say
// the step names, and there are no recordings of them saying numbers. So the engine's voice that
// sounds most like the chosen one says them: a woman's voice for Laura, a man's for Paul.
// Android names its voices like "en-us-x-iol-local" or "en-us-x-sfg#male_1-local"; the Google
// voices below are the US English ones whose sex the name does not say.
const knownFemaleVoices = ["sfg", "iob", "iog", "tpc", "tpf"];
const knownMaleVoices = ["iol", "iom", "tpd"];

type VoiceSex = "female" | "male";
const voiceSexes: Partial<Record<GuidedBreathingMode, VoiceSex>> = {
  laura: "female",
  paul: "male",
};

export const getSpeechVoiceSex = (identifier: string): VoiceSex | undefined => {
  const name = identifier.toLowerCase();
  if (/(^|[^e])male/.test(name)) return "male";
  if (name.includes("female")) return "female";
  const code = /-x-([a-z]{3})/.exec(name)?.[1];
  if (code && knownFemaleVoices.includes(code)) return "female";
  if (code && knownMaleVoices.includes(code)) return "male";
  return undefined;
};

// The voice to speak with, by the sex of the recorded voice: one in the phone's language when
// it has one, an English one otherwise. Undefined leaves the phone's default voice.
export const pickSpeechVoice = (
  voices: Pick<Speech.Voice, "identifier" | "language" | "quality">[],
  sex: VoiceSex,
  language: string,
) => {
  const matching = voices.filter((voice) => getSpeechVoiceSex(voice.identifier) === sex);
  const byLanguage = (prefix: string) =>
    matching.filter((voice) => voice.language.toLowerCase().startsWith(prefix));
  const candidates = [
    ...byLanguage(language.toLowerCase()),
    ...byLanguage(language.toLowerCase().slice(0, 2)),
    ...byLanguage("en"),
  ];
  // Voices that need the network stop speaking with the phone offline.
  return (candidates.find((voice) => !voice.identifier.includes("network")) ?? candidates[0])
    ?.identifier;
};

let speechVoices: Speech.Voice[] | undefined;
const speechVoiceFor = (voice: GuidedBreathingMode) => {
  const sex = voiceSexes[voice];
  if (!sex || !speechVoices) return undefined;
  const language = Intl.DateTimeFormat().resolvedOptions().locale ?? "en-US";
  return pickSpeechVoice(speechVoices, sex, language);
};
// No voice of that sex: a lower or higher pitch of the default voice still tells them apart.
const fallbackPitches: Partial<Record<GuidedBreathingMode, number>> = { laura: 1.1, paul: 0.85 };

// A number lasts well under the second before the next one, so they never queue up behind each
// other. `volumePercent` is the experience's volume for the numbers.
export const speakCountdownNumber = (
  value: number,
  voice: GuidedBreathingMode,
  volumePercent: number,
) => {
  try {
    const identifier = speechVoiceFor(voice);
    Speech.speak(String(value), {
      volume: volumePercent / 100,
      rate: 1.1,
      ...(identifier ? { voice: identifier } : { pitch: fallbackPitches[voice] }),
    });
  } catch {
    // The numbers on screen still count.
  }
};

// The text-to-speech engine starts on first use, and the first number would wait for it.
// The voice list is read here too, once, so the first number already has its voice.
export const warmUpCountdownSpeech = () => {
  void Speech.isSpeakingAsync().catch(() => undefined);
  if (!speechVoices) {
    void Speech.getAvailableVoicesAsync()
      .then((voices) => {
        speechVoices = voices;
      })
      .catch(() => undefined);
  }
};
