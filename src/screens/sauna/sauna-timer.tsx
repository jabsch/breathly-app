import Ionicons from "@expo/vector-icons/Ionicons";
import React, { FC, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { getSaunaRemainingMs, useSaunaStore } from "@breathly/stores/sauna";
import { useSettingsStore } from "@breathly/stores/settings";
import { maximumSaunaTimeLimitMs, minimumSaunaTimeLimitMs } from "@breathly/stores/settings-state";
import { formatTimer } from "@breathly/utils/format-timer";
import { useInterval } from "@breathly/utils/use-interval";

interface Props {
  // The exercise screen shows the sauna timer only once it has been started: setting it up
  // belongs to the home screen.
  hideWhenIdle?: boolean;
}

const minuteMs = 60_000;

// The sauna timer runs next to the breathing session, not inside it: it starts, pauses and
// stops on its own. Set the time while it is idle, then start it; it rings when the time is
// up, on any screen.
export const SaunaTimer: FC<Props> = ({ hideWhenIdle = false }) => {
  const theme = useThemeColors();
  const timer = useSaunaStore((state) => state.timer);
  const start = useSaunaStore((state) => state.start);
  const pause = useSaunaStore((state) => state.pause);
  const resume = useSaunaStore((state) => state.resume);
  const stop = useSaunaStore((state) => state.stop);
  const saunaTimeLimit = useSettingsStore((state) => state.saunaTimeLimit);
  const increaseSaunaTimeLimit = useSettingsStore((state) => state.increaseSaunaTimeLimit);
  const decreaseSaunaTimeLimit = useSettingsStore((state) => state.decreaseSaunaTimeLimit);
  const [nowMs, setNowMs] = useState(Date.now);

  useInterval(() => setNowMs(Date.now()), timer.status === "running" ? 250 : null);

  if (hideWhenIdle && timer.status === "idle") return null;

  const minutes = Math.round(saunaTimeLimit / minuteMs);
  const remainingText = formatTimer(Math.ceil(getSaunaRemainingMs(timer, nowMs) / 1000));
  const valueText =
    timer.status === "running"
      ? remainingText
      : timer.status === "paused"
        ? `${remainingText} paused`
        : timer.status === "finished"
          ? "Time's up"
          : `${minutes} min`;

  return (
    <View
      // An opaque card, so the stars of the session screen do not show through the text.
      style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}
      testID="sauna.timer"
      accessibilityLabel={`Sauna timer, ${valueText}`}
    >
      <View style={styles.header}>
        <Ionicons name="flame-outline" size={16} color={theme.textSecondary} />
        <Text style={[styles.label, { color: theme.textSecondary }]}>Sauna timer</Text>
      </View>
      <View style={styles.controls}>
        {timer.status === "idle" && (
          <IconButton
            icon="remove"
            label="Shorter sauna time"
            testID="sauna.decrease"
            onPress={decreaseSaunaTimeLimit}
            disabled={saunaTimeLimit <= minimumSaunaTimeLimitMs}
          />
        )}
        <Text
          style={[styles.text, { color: theme.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          testID="sauna.value"
        >
          {valueText}
        </Text>
        {timer.status === "idle" && (
          <IconButton
            icon="add"
            label="Longer sauna time"
            testID="sauna.increase"
            onPress={increaseSaunaTimeLimit}
            disabled={saunaTimeLimit >= maximumSaunaTimeLimitMs}
          />
        )}
        {timer.status === "running" && (
          <IconButton icon="pause" label="Pause sauna timer" testID="sauna.pause" onPress={pause} />
        )}
        {timer.status === "paused" && (
          <IconButton
            icon="play"
            label="Resume sauna timer"
            testID="sauna.resume"
            onPress={resume}
          />
        )}
        {timer.status !== "idle" && (
          <IconButton icon="stop" label="Stop sauna timer" testID="sauna.stop" onPress={stop} />
        )}
        {(timer.status === "idle" || timer.status === "finished") && (
          <Pressable
            onPress={() => start(saunaTimeLimit)}
            accessibilityRole="button"
            accessibilityLabel="Start sauna timer"
            testID="sauna.start"
            style={styles.startButton}
          >
            <Text style={styles.startLabel}>{timer.status === "finished" ? "Again" : "Start"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

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
    marginBottom: 24,
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  disabled: {
    opacity: 0.4,
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  label: {
    ...fontSizes.sm,
    fontFamily: fontFamilies.regular,
  },
  text: {
    ...fontSizes.lg,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
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
});
