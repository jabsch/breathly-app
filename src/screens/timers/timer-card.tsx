import Ionicons from "@expo/vector-icons/Ionicons";
import ms from "ms";
import React, { FC, PropsWithChildren, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { getActiveElapsedMs, useActiveSessionStore } from "@breathly/stores/active-session";
import { useHomePagerStore } from "@breathly/stores/home-pager";
import { useSettingsStore } from "@breathly/stores/settings";
import {
  maximumTimeLimitMs,
  maximumTimerDurationMs,
  minimumTimerDurationMs,
} from "@breathly/stores/settings-state";
import { getCountdownRemainingMs, useTimer, useTimersStore } from "@breathly/stores/timers";
import type { Experience } from "@breathly/types/experience";
import {
  formatPatternSteps,
  getExperienceDisplayName,
  getExperiencePatternName,
  getExperiencePatternSteps,
  voiceLabels,
} from "@breathly/utils/experience";
import { formatTimer } from "@breathly/utils/format-timer";
import { useInterval } from "@breathly/utils/use-interval";

// Where a card is drawn. The exercise page repeats the running timers, and each copy needs
// test ids of its own.
export type CardScope = "home" | "exercise";

interface CardProps {
  experience: Experience;
  scope: CardScope;
  onEdit?: (experience: Experience) => unknown;
}

const formatMinutes = (durationMs: number) => `${Math.round(durationMs / ms("1 min"))} min`;

// A saved "No Pattern: Custom Timer". It runs on its own, next to any other timer and next to
// a breathing session: set the time while it is idle, then start it; it rings when the time is
// up, on any screen.
export const TimerCard: FC<CardProps> = ({ experience, scope, onEdit }) => {
  const { id } = experience;
  const testID = `${scope}.experience.${id}`;
  const timer = useTimer(id);
  const start = useTimersStore((state) => state.start);
  const pause = useTimersStore((state) => state.pause);
  const resume = useTimersStore((state) => state.resume);
  const stop = useTimersStore((state) => state.stop);
  const adjustExperienceTime = useSettingsStore((state) => state.adjustExperienceTime);
  const [nowMs, setNowMs] = useState(Date.now);

  useInterval(() => setNowMs(Date.now()), timer.status === "running" ? 250 : null);

  const name = getExperienceDisplayName(experience);
  const remainingText = formatTimer(Math.ceil(getCountdownRemainingMs(timer, nowMs) / 1000));
  const valueText =
    timer.status === "running"
      ? remainingText
      : timer.status === "paused"
        ? `${remainingText} paused`
        : timer.status === "finished"
          ? "Time's up"
          : formatMinutes(experience.timerDurationMs);

  return (
    <Card
      testID={testID}
      icon="timer-outline"
      title={name}
      accessibilityLabel={`${name}, ${valueText}`}
      onEdit={onEdit && (() => onEdit(experience))}
    >
      <View style={styles.controls}>
        {timer.status === "idle" && (
          <IconButton
            icon="remove"
            label={`Shorter ${name}`}
            testID={`${testID}.decrease`}
            onPress={() => adjustExperienceTime(id, -1)}
            disabled={experience.timerDurationMs <= minimumTimerDurationMs}
          />
        )}
        <ValueText testID={`${testID}.value`}>{valueText}</ValueText>
        {timer.status === "idle" && (
          <IconButton
            icon="add"
            label={`Longer ${name}`}
            testID={`${testID}.increase`}
            onPress={() => adjustExperienceTime(id, 1)}
            disabled={experience.timerDurationMs >= maximumTimerDurationMs}
          />
        )}
        {timer.status === "running" && (
          <IconButton
            icon="pause"
            label={`Pause ${name}`}
            testID={`${testID}.pause`}
            onPress={() => pause(id)}
          />
        )}
        {timer.status === "paused" && (
          <IconButton
            icon="play"
            label={`Resume ${name}`}
            testID={`${testID}.resume`}
            onPress={() => resume(id)}
          />
        )}
        {timer.status !== "idle" && (
          <IconButton
            icon="stop"
            label={`Stop ${name}`}
            testID={`${testID}.stop`}
            onPress={() => stop(id)}
          />
        )}
        {(timer.status === "idle" || timer.status === "finished") && (
          <StartButton
            label={timer.status === "finished" ? "Again" : "Start"}
            accessibilityLabel={`Start ${name}`}
            testID={`${testID}.start`}
            onPress={() => start(id, experience.timerDurationMs)}
          />
        )}
      </View>
    </Card>
  );
};

// A saved breathing experience. Only one runs at a time: starting another one ends the one
// that runs. While it runs, the card shows its clock and controls it, and tapping the card
// brings the session back.
export const BreathingCard: FC<CardProps> = ({ experience, scope, onEdit }) => {
  const { id } = experience;
  const testID = `${scope}.experience.${id}`;
  const isActive = useActiveSessionStore((state) => state.experience?.id === id);
  const runningExperience = useActiveSessionStore((state) => state.experience);
  const session = useActiveSessionStore((state) => state.session);
  const startSession = useActiveSessionStore((state) => state.start);
  const pauseSession = useActiveSessionStore((state) => state.pauseByUser);
  const dispatchSession = useActiveSessionStore((state) => state.dispatch);
  const stopSession = useActiveSessionStore((state) => state.stop);
  const setPage = useHomePagerStore((state) => state.setPage);
  const adjustExperienceTime = useSettingsStore((state) => state.adjustExperienceTime);
  const [elapsedMs, setElapsedMs] = useState(getActiveElapsedMs);

  useInterval(
    () => setElapsedMs(getActiveElapsedMs()),
    isActive && session.status !== "completed" ? 500 : null,
  );

  const name = getExperienceDisplayName(experience);
  const patternLabel =
    experience.name !== ""
      ? `${getExperiencePatternName(experience)} (${formatPatternSteps(getExperiencePatternSteps(experience))})`
      : `(${formatPatternSteps(getExperiencePatternSteps(experience))})`;
  const details = [
    patternLabel,
    voiceLabels[experience.voice],
    experience.countdownNumbers && "Countdown",
    experience.softBeeps && "Beeps",
  ]
    .filter(Boolean)
    .join(" · ");

  // The clock of the running session, from the copy it started with.
  const limit = isActive ? (runningExperience?.timeLimit ?? 0) : experience.timeLimit;
  const clockText = formatTimer(
    limit > 0 ? Math.ceil(Math.max(0, limit - elapsedMs) / 1000) : Math.floor(elapsedMs / 1000),
  );
  const valueText = !isActive
    ? experience.timeLimit > 0
      ? formatMinutes(experience.timeLimit)
      : "No limit"
    : session.status === "completed"
      ? "Complete"
      : session.status === "paused"
        ? `${clockText} paused`
        : session.status === "interlude"
          ? "Starting"
          : clockText;

  const handleStart = () => {
    startSession(experience);
    setPage("exercise");
  };

  return (
    <Card
      testID={testID}
      icon="body-outline"
      title={name}
      details={details}
      accessibilityLabel={`${name}, ${valueText}`}
      onEdit={onEdit && (() => onEdit(experience))}
      onPress={isActive ? () => setPage("exercise") : undefined}
      pressLabel={`Show ${name}`}
    >
      <View style={styles.controls}>
        {!isActive && (
          <IconButton
            icon="remove"
            label={`Shorter ${name}`}
            testID={`${testID}.decrease`}
            onPress={() => adjustExperienceTime(id, -1)}
            disabled={experience.timeLimit <= 0}
          />
        )}
        <ValueText testID={`${testID}.value`}>{valueText}</ValueText>
        {!isActive && (
          <IconButton
            icon="add"
            label={`Longer ${name}`}
            testID={`${testID}.increase`}
            onPress={() => adjustExperienceTime(id, 1)}
            disabled={experience.timeLimit >= maximumTimeLimitMs}
          />
        )}
        {isActive && (session.status === "running" || session.status === "interlude") && (
          <IconButton
            icon="pause"
            label={`Pause ${name}`}
            testID={`${testID}.pause`}
            onPress={pauseSession}
          />
        )}
        {isActive && session.status === "paused" && (
          <IconButton
            icon="play"
            label={`Resume ${name}`}
            testID={`${testID}.resume`}
            onPress={() => dispatchSession({ type: "resume" })}
          />
        )}
        {isActive && (
          <IconButton
            icon="stop"
            label={`Stop ${name}`}
            testID={`${testID}.stop`}
            onPress={stopSession}
          />
        )}
        {(!isActive || session.status === "completed") && (
          <StartButton
            label={isActive ? "Again" : "Start"}
            accessibilityLabel={`Start ${name}`}
            testID={`${testID}.start`}
            onPress={handleStart}
          />
        )}
      </View>
    </Card>
  );
};

export const ExperienceCard: FC<CardProps> = (props) =>
  props.experience.kind === "timer" ? <TimerCard {...props} /> : <BreathingCard {...props} />;

interface CardFrameProps {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  details?: string;
  accessibilityLabel: string;
  onEdit?: () => unknown;
  onPress?: () => unknown;
  pressLabel?: string;
}

const Card: FC<PropsWithChildren<CardFrameProps>> = ({
  testID,
  icon,
  title,
  details,
  accessibilityLabel,
  onEdit,
  onPress,
  pressLabel,
  children,
}) => {
  const theme = useThemeColors();
  return (
    <View
      // An opaque card, so the stars of the session screen do not show through the text.
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
      testID={testID}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerText}
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel={onPress ? pressLabel : accessibilityLabel}
          testID={`${testID}.open`}
        >
          <View style={styles.titleRow}>
            <Ionicons name={icon} size={16} color={theme.textSecondary} />
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            {onPress && <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />}
          </View>
          {details !== undefined && (
            <Text style={[styles.details, { color: theme.textSecondary }]} numberOfLines={1}>
              {details}
            </Text>
          )}
        </Pressable>
        {onEdit && (
          <IconButton
            icon="create-outline"
            label={`Edit ${title}`}
            testID={`${testID}.edit`}
            onPress={onEdit}
          />
        )}
      </View>
      {children}
    </View>
  );
};

const ValueText: FC<PropsWithChildren<{ testID: string }>> = ({ testID, children }) => {
  const theme = useThemeColors();
  return (
    <Text
      style={[styles.text, { color: theme.text }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      testID={testID}
    >
      {children}
    </Text>
  );
};

interface StartButtonProps {
  label: string;
  accessibilityLabel: string;
  testID: string;
  onPress: () => unknown;
}

const StartButton: FC<StartButtonProps> = ({ label, accessibilityLabel, testID, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    testID={testID}
    style={styles.startButton}
  >
    <Text style={styles.startLabel}>{label}</Text>
  </Pressable>
);

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID: string;
  onPress: () => unknown;
  disabled?: boolean;
}

const IconButton: FC<IconButtonProps> = ({ icon, label, testID, onPress, disabled }) => {
  const theme = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      onLongPressInterval={icon === "add" || icon === "remove" ? onPress : undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      <Ionicons name={icon} size={20} color={theme.control} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
    maxWidth: 320,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 288,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  details: {
    ...fontSizes.sm,
    fontFamily: fontFamilies.regular,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.4,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  headerText: {
    flex: 1,
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  startButton: {
    backgroundColor: colors.pastel["orange-light"],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  startLabel: {
    ...fontSizes.base,
    color: colors["slate-800"],
    fontFamily: fontFamilies.regular,
  },
  text: {
    ...fontSizes.lg,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  title: {
    ...fontSizes.base,
    flexShrink: 1,
    fontFamily: fontFamilies.regular,
  },
  titleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
});
