import Ionicons from "@expo/vector-icons/Ionicons";
import { useKeepAwake } from "expo-keep-awake";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { widestDeviceDimension } from "@breathly/design/metrics";
import { useColorScheme, useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import {
  announceForScreenReader,
  announceLiveRegionUpdate,
  getStepAccessibilityLabel,
  sessionPausedAnnouncement,
} from "@breathly/screens/exercise-screen/accessibility-announcements";
import { AnimatedDots } from "@breathly/screens/exercise-screen/animated-dots";
import {
  getExerciseStepTransition,
  type ResumableExerciseStatus,
} from "@breathly/screens/exercise-screen/exercise-session";
import { StepDescription } from "@breathly/screens/exercise-screen/step-description";
import { runStepSeconds } from "@breathly/screens/exercise-screen/step-seconds";
import { useExerciseAudio } from "@breathly/screens/exercise-screen/use-exercise-audio";
import { useExerciseHaptics } from "@breathly/screens/exercise-screen/use-exercise-haptics";
import { useExerciseLoop } from "@breathly/screens/exercise-screen/use-exercise-loop";
import { StarsBackground } from "@breathly/screens/home-screen/stars-background";
import { RunningTimers } from "@breathly/screens/timers/running-timers";
import {
  playSoftBeep,
  speakCountdownNumber,
  warmUpCountdownSpeech,
} from "@breathly/services/audio";
import { useBackgroundSession } from "@breathly/services/background-session";
import { setActiveElapsedMs, useActiveSessionStore } from "@breathly/stores/active-session";
import { useHomePagerStore } from "@breathly/stores/home-pager";
import { useSettingsStore } from "@breathly/stores/settings";
import type { Experience } from "@breathly/types/experience";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import { StepMetadata } from "@breathly/types/step-metadata";
import { animate } from "@breathly/utils/animate";
import { buildStepsMetadata } from "@breathly/utils/build-steps-metadata";
import { getExperienceDisplayName, getExperiencePatternSteps } from "@breathly/utils/experience";
import { useScreenReaderEnabled } from "@breathly/utils/use-accessibility-preferences";
import { useOnUpdate } from "@breathly/utils/use-on-update";
import { BreathingAnimation } from "./breathing-animation";
import { ExerciseComplete } from "./complete";
import { ExerciseInterlude } from "./interlude";
import { Timer } from "./timer";

// The voice that the exercise uses for a user of a screen reader who disabled
// it. It is the default voice of the app.
const screenReaderFallbackVoice: GuidedBreathingMode = "paul";

// The ending bell lasts about six seconds.
const endingBellHoldMs = 8000;

// The voice cue at the start of a step, if the voice plays one there. The bell only marks the
// two direction changes.
const voiceCuesStep = (voice: GuidedBreathingMode, stepId: StepMetadata["id"]) =>
  voice === "laura" ||
  voice === "paul" ||
  (voice === "bell" && (stepId === "inhale" || stepId === "exhale"));

interface ExercisePanelProps {
  experience: Experience;
  // False while the user has swiped over to the home page. The session runs on either way.
  visible: boolean;
}

// The running breathing session. It is a page of the home screen rather than a screen of its
// own, so it keeps running, cues and all, while the user is on the home page or in the menu.
export const ExercisePanel: FC<ExercisePanelProps> = ({ experience, visible }) => {
  const guidedBreathingVoice = experience.voice;
  const screenReaderEnabled = useScreenReaderEnabled();
  // A user of a screen reader who disabled the voice has no channel that works
  // without sight, because the visuals carry the whole exercise. The voice
  // therefore starts, but the app does not write the setting: the user keeps
  // the choice made in the settings screen.
  const effectiveGuidedBreathingVoice =
    screenReaderEnabled && guidedBreathingVoice === "disabled"
      ? screenReaderFallbackVoice
      : guidedBreathingVoice;
  const session = useActiveSessionStore((state) => state.session);
  const dispatchSession = useActiveSessionStore((state) => state.dispatch);
  const pauseByUser = useActiveSessionStore((state) => state.pauseByUser);
  const stopSession = useActiveSessionStore((state) => state.stop);
  const setPage = useHomePagerStore((state) => state.setPage);
  const activeElapsedMs = useRef(0);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = useThemeColors();

  const { playExerciseStepAudio, playExerciseCompletedAudio, stopExerciseAudio } = useExerciseAudio(
    effectiveGuidedBreathingVoice,
  );

  // On Android the session keeps running, cues included, while the screen is off or another
  // app is in front. Elsewhere, or if Android refused the service, it pauses in the background.
  const experienceName = getExperienceDisplayName(experience);
  const [endingBellFinished, setEndingBellFinished] = useState(false);
  const continuesInBackground = useBackgroundSession(
    session.status === "interlude" ||
      session.status === "running" ||
      // The bell rings on after the session completes: releasing the wake lock with the
      // screen off would cut it short.
      (session.status === "completed" && !endingBellFinished),
    `${experienceName} session in progress`,
  );

  useEffect(() => {
    if (session.status !== "completed") return;
    const timeout = setTimeout(() => setEndingBellFinished(true), endingBellHoldMs);
    return () => clearTimeout(timeout);
  }, [session.status]);

  useEffect(() => {
    if (continuesInBackground) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      // iOS reports "inactive" for the Control Center, the Notification Center,
      // the app switcher and the banner of an incoming call. The app stays on
      // the screen and the user comes back to a live session, thus only a real
      // background interrupts the exercise.
      if (nextAppState === "background") {
        stopExerciseAudio();
        dispatchSession({ type: "pause", activeElapsedMs: activeElapsedMs.current });
        return;
      }

      // Coming back, silence anything expo-audio resumed on its own. It pauses the players
      // it interrupted and replays them afterwards, and the JS AppState event arrives after
      // its native observers have already run — so a cue caught mid-word would otherwise
      // finish in the middle of the wrong step, seconds or minutes later.
      if (nextAppState === "active") stopExerciseAudio();
    });

    return () => subscription.remove();
  }, [continuesInBackground, dispatchSession, stopExerciseAudio]);

  const handleInterludeComplete = useCallback(() => {
    dispatchSession({ type: "start" });
  }, [dispatchSession]);

  const handleExerciseStepChange = useCallback(
    (stepMetadata: StepMetadata) => {
      playExerciseStepAudio(stepMetadata);
    },
    [playExerciseStepAudio],
  );

  const handleExerciseComplete = useCallback(() => {
    playExerciseCompletedAudio();
    dispatchSession({ type: "complete", activeElapsedMs: activeElapsedMs.current });
  }, [dispatchSession, playExerciseCompletedAudio]);

  const handleStepIndexChange = useCallback(
    (stepIndex: number) => {
      dispatchSession({ type: "stepChanged", stepIndex });
    },
    [dispatchSession],
  );

  const handleActiveElapsedChange = useCallback((elapsedMs: number) => {
    activeElapsedMs.current = elapsedMs;
    setActiveElapsedMs(elapsedMs);
  }, []);

  const handleResume = useCallback(() => {
    dispatchSession({ type: "resume" });
  }, [dispatchSession]);

  const handleClose = useCallback(() => {
    stopSession();
    setPage("home");
  }, [setPage, stopSession]);

  return (
    <View
      testID="exercise.screen"
      style={[
        styles.screen,
        {
          // Paddings to handle safe area
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView style={styles.timersList} contentContainerStyle={styles.timersRow}>
        <RunningTimers scope="exercise" />
      </ScrollView>
      {session.status === "interlude" && <ExerciseInterlude onComplete={handleInterludeComplete} />}
      {session.status === "running" && (
        <>
          {colorScheme === "dark" && (
            <StarsBackground size={widestDeviceDimension * 0.8} fadeIn={true} />
          )}
          <ExerciseRunningFragment
            experience={experience}
            continuesInBackground={continuesInBackground}
            onComplete={handleExerciseComplete}
            onStepChange={handleExerciseStepChange}
            onStepIndexChange={handleStepIndexChange}
            initialActiveElapsedMs={session.activeElapsedMs}
            onActiveElapsedChange={handleActiveElapsedChange}
            initialStepIndex={session.currentStepIndex}
          />
        </>
      )}
      {session.status === "paused" && (
        <ExercisePaused
          resumeStatus={session.resumeStatus}
          pausedByUser={session.pausedByUser ?? false}
          onResume={handleResume}
        />
      )}
      {session.status === "completed" && <ExerciseComplete />}
      {/* The countdown and the paused screen need the display awake as much as the exercise
          does — a screen that locks during the countdown pauses the session before it starts.
          The completion screen does not: it never dismisses itself, so holding the display on
          there would keep it lit until the user came back to the phone. */}
      {session.status !== "completed" && visible && <KeepDisplayAwake />}
      <View style={styles.closeButtonRow}>
        {(session.status === "interlude" || session.status === "running") && (
          <Pressable
            style={[styles.closeButton, { borderColor: theme.control }]}
            onPress={pauseByUser}
            testID="exercise.pause"
            accessibilityLabel="Pause breathing session"
            accessibilityRole="button"
          >
            <Ionicons name="pause" size={22} color={theme.control} />
          </Pressable>
        )}
        <Pressable
          style={[styles.closeButton, { borderColor: theme.control }]}
          onPress={() => setPage("home")}
          testID="exercise.minimize"
          accessibilityLabel="Show the home page, the session keeps running"
          accessibilityRole="button"
        >
          <Ionicons name="albums-outline" size={22} color={theme.control} />
        </Pressable>
        <Pressable
          style={[styles.closeButton, { borderColor: theme.control }]}
          onPress={handleClose}
          testID="exercise.close"
          accessibilityLabel="Close breathing session"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={22} color={theme.control} />
        </Pressable>
      </View>
    </View>
  );
};

// `useKeepAwake` releases on unmount, so mounting it conditionally is what scopes it.
const KeepDisplayAwake: FC = () => {
  useKeepAwake();
  return null;
};

interface ExerciseRunningFragmentProps {
  experience: Experience;
  continuesInBackground: boolean;
  onComplete: () => unknown;
  onStepChange: (stepMetadata: StepMetadata) => unknown;
  onStepIndexChange: (stepIndex: number) => void;
  initialActiveElapsedMs: number;
  onActiveElapsedChange: (elapsedMs: number) => void;
  initialStepIndex: number;
}

const unmountAnimDuration = 300;

const ExerciseRunningFragment: FC<ExerciseRunningFragmentProps> = ({
  experience,
  continuesInBackground,
  onComplete,
  onStepChange,
  onStepIndexChange,
  initialActiveElapsedMs,
  onActiveElapsedChange,
  initialStepIndex,
}) => {
  const { timeLimit, voice, countdownNumbers, speakNumbers, softBeeps } = experience;
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const selectedPatternSteps = useMemo(() => getExperiencePatternSteps(experience), [experience]);
  const [unmountContentAnimVal] = useState(new Animated.Value(1));
  const stepsMetadata = useMemo(
    () => buildStepsMetadata(selectedPatternSteps),
    [selectedPatternSteps],
  );

  const theme = useThemeColors();
  const { currentStep, exerciseAnimVal, textAnimVal } = useExerciseLoop(
    stepsMetadata,
    initialStepIndex,
    onStepIndexChange,
  );

  const playStepHaptic = useExerciseHaptics(vibrationEnabled);

  // The time limit does not stop the exercise on its own: it only arms the
  // completion. The step transition below then stops the exercise at the end of
  // the first step that leaves the lungs empty.
  const timeLimitReachedRef = useRef(false);
  const completionStartedRef = useRef(false);

  // The fade is only visual. Android runs no animation frames while the screen is off, so a
  // completion that waited for the fade to finish would never ring the ending bell there.
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(completionTimeoutRef.current), []);

  const startCompletion = () => {
    if (completionStartedRef.current) return;
    completionStartedRef.current = true;
    animate(unmountContentAnimVal, {
      toValue: 0,
      duration: unmountAnimDuration,
    }).start();
    completionTimeoutRef.current = setTimeout(onComplete, unmountAnimDuration);
  };

  useOnUpdate(
    (prevStepMetadata) => {
      // An empty pattern would leave no current step. The duration limits stop that today,
      // but nothing here should depend on that.
      if (!currentStep) return;

      const transition = getExerciseStepTransition(
        prevStepMetadata?.id,
        currentStep.id,
        timeLimitReachedRef.current,
      );
      if (transition === "complete") {
        startCompletion();
      } else if (transition === "startStep") {
        onStepChange(currentStep);
        playStepHaptic();
        announceLiveRegionUpdate(
          getStepAccessibilityLabel(currentStep.label, currentStep.duration),
        );
      }
    },
    currentStep,
    true,
  );

  // The countdown numbers, the spoken count and the beeps all follow the seconds of the step.
  // The voice says the step's name at its start, so the spoken count starts with the second
  // number, unless no voice cue plays there.
  const [secondsRemaining, setSecondsRemaining] = useState<number | undefined>(undefined);
  const countsSeconds = countdownNumbers || speakNumbers || softBeeps;
  useEffect(() => {
    if (speakNumbers) warmUpCountdownSpeech();
  }, [speakNumbers]);
  useEffect(() => {
    if (!currentStep || !countsSeconds) return;
    const stepCued = voiceCuesStep(voice, currentStep.id);
    return runStepSeconds(currentStep.duration, (remaining, index) => {
      // The step after the last one only ends the session.
      if (completionStartedRef.current) return;
      setSecondsRemaining(remaining);
      if (softBeeps) void playSoftBeep();
      if (speakNumbers && (index > 0 || !stepCued)) speakCountdownNumber(remaining);
    });
  }, [countsSeconds, currentStep, softBeeps, speakNumbers, voice]);

  const handleTimeLimitReached = useCallback(() => {
    timeLimitReachedRef.current = true;
  }, []);

  const contentAnimatedStyle = {
    opacity: unmountContentAnimVal,
  };

  return (
    <Animated.View style={[styles.runningContent, contentAnimatedStyle]} testID="exercise.running">
      <Timer
        countsInBackground={continuesInBackground}
        limit={timeLimit}
        initialActiveElapsedMs={initialActiveElapsedMs}
        onActiveElapsedChange={onActiveElapsedChange}
        onLimitReached={handleTimeLimitReached}
      />
      {currentStep && (
        <View style={styles.stepContent}>
          <BreathingAnimation animationValue={exerciseAnimVal} />
          <StepDescription
            label={currentStep.label}
            durationMs={currentStep.duration}
            animationValue={textAnimVal}
          />
          {countdownNumbers && secondsRemaining !== undefined && (
            <Text
              style={[styles.countdown, { color: theme.text }]}
              testID="exercise.countdown"
              // The step label already tells a screen reader how long the step lasts.
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              {secondsRemaining}
            </Text>
          )}
          <AnimatedDots
            numberOfDots={3}
            totalDuration={currentStep.duration}
            visible={currentStep.id === "afterInhale" || currentStep.id === "afterExhale"}
          />
        </View>
      )}
    </Animated.View>
  );
};

interface ExercisePausedProps {
  resumeStatus?: ResumableExerciseStatus;
  pausedByUser: boolean;
  onResume: () => void;
}

const ExercisePaused: FC<ExercisePausedProps> = ({ resumeStatus, pausedByUser, onResume }) => {
  const isDarkMode = useColorScheme() === "dark";
  const theme = useThemeColors();

  // The step announcements simply stop when the session pauses. Without this a screen-reader
  // user is told nothing at all, and the completion screen already announces itself.
  useEffect(() => {
    announceForScreenReader(sessionPausedAnnouncement);
  }, []);

  return (
    <View style={styles.pausedScreen} testID="exercise.paused">
      <Text
        accessibilityRole="header"
        style={[styles.pausedTitle, isDarkMode && styles.pausedTitleDark]}
      >
        Paused
      </Text>
      <Text style={[styles.pausedDescription, { color: theme.textSecondary }]}>
        {pausedByUser
          ? "Take your time. The session continues where you left off."
          : resumeStatus === "interlude"
            ? "The starting countdown was interrupted."
            : "The session paused while Breathly was in the background."}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Resume breathing session"
        style={styles.resumeButton}
        onPress={onResume}
        testID="exercise.resume"
      >
        <Text style={styles.resumeButtonLabel}>Resume</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  timersList: {
    flexGrow: 0,
    maxHeight: 200,
  },
  timersRow: {
    alignItems: "center",
    paddingTop: 8,
  },
  countdown: {
    ...fontSizes.xxl5,
    lineHeight: 56,
    fontFamily: fontFamilies.regular,
    fontVariant: ["tabular-nums"],
    marginBottom: 8,
    textAlign: "center",
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 2,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  closeButtonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 24,
    justifyContent: "center",
    paddingBottom: 40,
    paddingTop: 24,
  },
  pausedDescription: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
    marginBottom: 32,
    textAlign: "center",
  },
  pausedScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  pausedTitle: {
    ...fontSizes.xxl5,
    color: colors["slate-800"],
    fontFamily: fontFamilies.serifMedium,
    marginBottom: 16,
    textAlign: "center",
  },
  pausedTitleDark: {
    color: colors.white,
  },
  resumeButton: {
    alignItems: "center",
    backgroundColor: colors.pastel["orange-light"],
    borderRadius: 8,
    maxWidth: 320,
    paddingHorizontal: 32,
    paddingVertical: 8,
    width: 288,
  },
  resumeButtonLabel: {
    ...fontSizes.lg,
    color: colors["slate-800"],
    fontFamily: fontFamilies.regular,
    paddingVertical: 4,
  },
  runningContent: {
    flex: 1,
  },
  screen: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  stepContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
