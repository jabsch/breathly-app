import Ionicons from "@expo/vector-icons/Ionicons";
import ms from "ms";
import React, {
  FC,
  PropsWithChildren,
  ReactNode,
  createContext,
  useContext,
  useState,
} from "react";
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
// test ids of its own. "peek" is a neighbour drawn beside a home place while a swipe drags it in.
export type CardScope = "home" | "exercise" | "peek";

// How a card is drawn: a bordered card (the timers on the session page), a timer row on the
// home page, or the breathing section at its bottom. Rows and the section have no box around
// them, a height set in the settings, and text that grows with that height.
export type CardLayout = "card" | "row" | "section";

interface CardProps {
  experience: Experience;
  scope: CardScope;
  onEdit?: (experience: Experience) => unknown;
  layout?: CardLayout;
  height?: number;
  // Drawn next to the edit button: the swipe lock of a home place.
  accessory?: ReactNode;
}

interface LayoutContextValue {
  layout: CardLayout;
  // 1 at the default height; bigger places get bigger text and buttons.
  scale: number;
}

const LayoutContext = createContext<LayoutContextValue>({ layout: "card", scale: 1 });

const defaultHeights: Record<Exclude<CardLayout, "card">, number> = { row: 80, section: 200 };

const getScale = (layout: CardLayout, height: number | undefined) =>
  layout === "card" || height == null
    ? 1
    : Math.min(1.8, Math.max(0.9, height / defaultHeights[layout]));

const formatMinutes = (durationMs: number) => `${Math.round(durationMs / ms("1 min"))} min`;

// A saved "No Pattern: Custom Timer". It runs on its own, next to any other timer and next to
// a breathing session: set the time while it is idle, then start it; it rings when the time is
// up, on any screen.
export const TimerCard: FC<CardProps> = ({
  experience,
  scope,
  onEdit,
  layout = "card",
  height,
  accessory,
}) => {
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
      layout={layout}
      height={height}
      accessory={accessory}
      accessibilityLabel={`${name}, ${valueText}`}
      onEdit={onEdit && (() => onEdit(experience))}
    >
      <>
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
      </>
    </Card>
  );
};

// A saved breathing experience. Only one runs at a time: starting another one ends the one
// that runs. While it runs, the card shows its clock and controls it, and tapping the card
// brings the session back.
export const BreathingCard: FC<CardProps> = ({
  experience,
  scope,
  onEdit,
  layout = "card",
  height,
  accessory,
}) => {
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
      layout={layout}
      height={height}
      accessory={accessory}
      details={details}
      accessibilityLabel={`${name}, ${valueText}`}
      onEdit={onEdit && (() => onEdit(experience))}
      onPress={isActive ? () => setPage("exercise") : undefined}
      pressLabel={`Show ${name}`}
    >
      <>
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
      </>
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
  layout: CardLayout;
  height?: number;
  accessory?: ReactNode;
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
  layout,
  height,
  accessory,
  children,
}) => {
  const theme = useThemeColors();
  const scale = getScale(layout, height);
  const isSection = layout === "section";
  const actions = (onEdit || accessory) && (
    <View style={[styles.actions, isSection && styles.sectionActions]}>
      {accessory}
      {onEdit && (
        <IconButton
          icon="create-outline"
          label={`Edit ${title}`}
          testID={`${testID}.edit`}
          onPress={onEdit}
        />
      )}
    </View>
  );

  return (
    <LayoutContext.Provider value={{ layout, scale }}>
      <View
        style={[
          layout === "card" && [
            // An opaque card, so the stars of the session screen do not show through the text.
            styles.card,
            { backgroundColor: theme.background, borderColor: theme.border },
          ],
          layout === "row" && [styles.row, { height }],
          isSection && [styles.section, { height }],
        ]}
        testID={testID}
      >
        <View style={[styles.header, isSection && styles.sectionHeader]}>
          <Pressable
            style={[styles.headerText, isSection && styles.sectionHeaderText]}
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={onPress ? pressLabel : accessibilityLabel}
            testID={`${testID}.open`}
          >
            <View style={[styles.titleRow, isSection && styles.sectionTitleRow]}>
              {!isSection && <Ionicons name={icon} size={16 * scale} color={theme.textSecondary} />}
              <Text
                style={[
                  isSection ? styles.sectionTitle : styles.title,
                  { color: theme.text },
                  isSection
                    ? { fontSize: 28 * scale, lineHeight: 36 * scale }
                    : { fontSize: 16 * scale, lineHeight: 24 * scale },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={isSection}
              >
                {title}
              </Text>
              {onPress && (
                <Ionicons name="chevron-forward" size={16 * scale} color={theme.textSecondary} />
              )}
            </View>
            {details !== undefined && (
              <Text
                style={[
                  styles.details,
                  isSection && styles.sectionDetails,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {details}
              </Text>
            )}
          </Pressable>
          {!isSection && actions}
        </View>
        <View style={[styles.controls, isSection && styles.sectionControls]}>{children}</View>
        {isSection && actions}
      </View>
    </LayoutContext.Provider>
  );
};

const ValueText: FC<PropsWithChildren<{ testID: string }>> = ({ testID, children }) => {
  const theme = useThemeColors();
  const { layout, scale } = useContext(LayoutContext);
  const size = (layout === "section" ? 22 : 18) * scale;
  return (
    <Text
      style={[
        styles.text,
        layout === "section" && styles.sectionText,
        { color: theme.text, fontSize: size, lineHeight: size * 1.5 },
        // Wide enough for "60 min" or "00:00 paused" not to be cut short.
        layout === "section" && { minWidth: 96 * scale },
      ]}
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

const StartButton: FC<StartButtonProps> = ({ label, accessibilityLabel, testID, onPress }) => {
  const { layout, scale } = useContext(LayoutContext);
  const isSection = layout === "section";
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        styles.startButton,
        isSection && styles.sectionStartButton,
        {
          paddingHorizontal: (isSection ? 22 : 12) * scale,
          paddingVertical: (isSection ? 8 : 4) * scale,
        },
      ]}
    >
      <Text style={[styles.startLabel, { fontSize: (isSection ? 18 : 16) * scale }]}>{label}</Text>
    </Pressable>
  );
};

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID: string;
  onPress: () => unknown;
  disabled?: boolean;
}

export const IconButton: FC<IconButtonProps> = ({ icon, label, testID, onPress, disabled }) => {
  const theme = useThemeColors();
  const { scale } = useContext(LayoutContext);
  return (
    <Pressable
      onPress={onPress}
      onLongPressInterval={icon === "add" || icon === "remove" ? onPress : undefined}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[
        styles.iconButton,
        { height: 32 * scale, width: 32 * scale },
        disabled && styles.disabled,
      ]}
    >
      <Ionicons name={icon} size={20 * scale} color={theme.control} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
  },
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
  row: {
    alignSelf: "stretch",
    gap: 2,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  section: {
    alignItems: "center",
    alignSelf: "stretch",
    gap: 6,
    justifyContent: "center",
    paddingBottom: 18,
    paddingHorizontal: 28,
  },
  sectionActions: {
    position: "absolute",
    right: 16,
    top: 4,
  },
  // A taller section has bigger controls; when they no longer fit on one line, the start
  // button moves under the time.
  sectionControls: {
    alignSelf: "stretch",
    columnGap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: 6,
  },
  sectionDetails: {
    textAlign: "center",
  },
  sectionHeader: {
    alignSelf: "stretch",
    paddingHorizontal: 56,
  },
  sectionHeaderText: {
    alignItems: "center",
  },
  sectionStartButton: {
    borderRadius: 999,
    marginLeft: 6,
  },
  // Sized by its text: a zero basis, which `flex: 1` leaves behind, would never wrap.
  sectionText: {
    flexBasis: "auto",
    flexGrow: 0,
    flexShrink: 0,
  },
  sectionTitle: {
    flexShrink: 1,
    fontFamily: fontFamilies.serifSemibold,
    textAlign: "center",
  },
  sectionTitleRow: {
    justifyContent: "center",
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
