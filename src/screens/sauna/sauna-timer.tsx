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
  // The exercise screen shows the countdown only: its controls belong to the breathing.
  compact?: boolean;
}

const minuteMs = 60_000;

// The sauna timer runs next to the breathing session, not inside it. Set the time while it
// is idle, then start it; it rings when the time is up, on any screen.
export const SaunaTimer: FC<Props> = ({ compact = false }) => {
  const theme = useThemeColors();
  const timer = useSaunaStore((state) => state.timer);
  const start = useSaunaStore((state) => state.start);
  const stop = useSaunaStore((state) => state.stop);
  const saunaTimeLimit = useSettingsStore((state) => state.saunaTimeLimit);
  const increaseSaunaTimeLimit = useSettingsStore((state) => state.increaseSaunaTimeLimit);
  const decreaseSaunaTimeLimit = useSettingsStore((state) => state.decreaseSaunaTimeLimit);
  const [nowMs, setNowMs] = useState(Date.now);

  useInterval(() => setNowMs(Date.now()), timer.status === "running" ? 250 : null);

  if (compact && timer.status === "idle") return null;

  const minutes = Math.round(saunaTimeLimit / minuteMs);
  const remainingSeconds = Math.ceil(getSaunaRemainingMs(timer, nowMs) / 1000);
  const valueText =
    timer.status === "running"
      ? formatTimer(remainingSeconds)
      : timer.status === "finished"
        ? "Time's up"
        : `${minutes} min`;

  const textStyle = [styles.text, { color: theme.text }];

  if (compact) {
    return (
      <View style={styles.compactRow} testID="sauna.compact">
        <Ionicons name="flame-outline" size={18} color={theme.textSecondary} />
        <Text style={[styles.compactText, { color: theme.textSecondary }]}>
          {`Sauna ${valueText}`}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.card, { borderColor: theme.border }]}
      testID="sauna.timer"
      accessibilityLabel={`Sauna timer, ${valueText}`}
    >
      <Ionicons name="flame-outline" size={22} color={theme.control} />
      <Text style={[styles.label, { color: theme.textSecondary }]}>Sauna</Text>
      {timer.status === "idle" && (
        <Pressable
          onPress={decreaseSaunaTimeLimit}
          onLongPressInterval={decreaseSaunaTimeLimit}
          disabled={saunaTimeLimit <= minimumSaunaTimeLimitMs}
          accessibilityRole="button"
          accessibilityLabel="Shorter sauna time"
          testID="sauna.decrease"
          style={styles.iconButton}
        >
          <Ionicons name="remove" size={20} color={theme.control} />
        </Pressable>
      )}
      <Text style={textStyle} testID="sauna.value">
        {valueText}
      </Text>
      {timer.status === "idle" && (
        <Pressable
          onPress={increaseSaunaTimeLimit}
          onLongPressInterval={increaseSaunaTimeLimit}
          disabled={saunaTimeLimit >= maximumSaunaTimeLimitMs}
          accessibilityRole="button"
          accessibilityLabel="Longer sauna time"
          testID="sauna.increase"
          style={styles.iconButton}
        >
          <Ionicons name="add" size={20} color={theme.control} />
        </Pressable>
      )}
      <Pressable
        onPress={timer.status === "running" ? stop : () => start(saunaTimeLimit)}
        accessibilityRole="button"
        accessibilityLabel={timer.status === "running" ? "Stop sauna timer" : "Start sauna timer"}
        testID="sauna.toggle"
        style={styles.toggleButton}
      >
        <Text style={styles.toggleLabel}>
          {timer.status === "running" ? "Stop" : timer.status === "finished" ? "Again" : "Start"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    maxWidth: 320,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 288,
  },
  compactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingTop: 8,
  },
  compactText: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
    fontVariant: ["tabular-nums"],
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  label: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
  },
  text: {
    ...fontSizes.lg,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  toggleButton: {
    backgroundColor: colors.pastel["orange-light"],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  toggleLabel: {
    ...fontSizes.base,
    color: colors["slate-800"],
    fontFamily: fontFamilies.regular,
  },
});
