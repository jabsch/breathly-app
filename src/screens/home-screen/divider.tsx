import { LinearGradient } from "expo-linear-gradient";
import React, { FC } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColors } from "@breathly/design/theme";
import { useSettingsStore } from "@breathly/stores/settings";
import type { DividerColor, DividerStyle } from "@breathly/stores/settings-state";

export const dividerStyleLabels: Record<DividerStyle, string> = {
  ornament: "Ornament",
  fade: "Fading line",
  double: "Double line",
  dotted: "Dots",
  simple: "Plain line",
  none: "None",
};

export const dividerColorLabels: Record<DividerColor, string> = {
  peach: "Peach",
  gold: "Gold",
  lavender: "Lavender",
  sky: "Sky",
  theme: "Muted",
};

const dividerColorValues: Record<Exclude<DividerColor, "theme">, string> = {
  peach: "#F2CAAD",
  gold: "#E8C872",
  lavender: "#C4B5FD",
  sky: "#93C5FD",
};

// Fades a hex colour, for the ends of a line that fades out. "#rrggbb" plus two hex digits.
const withAlpha = (color: string, alpha: number) =>
  `${color}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

// `towards` is the end that stays bright: a line beside an ornament fades away from it.
const FadingLine: FC<{ color: string; towards?: "left" | "right" }> = ({ color, towards }) => (
  <LinearGradient
    colors={
      towards === "right"
        ? [withAlpha(color, 0), withAlpha(color, 0.85)]
        : towards === "left"
          ? [withAlpha(color, 0.85), withAlpha(color, 0)]
          : [withAlpha(color, 0), withAlpha(color, 0.85), withAlpha(color, 0)]
    }
    start={{ x: 0, y: 0.5 }}
    end={{ x: 1, y: 0.5 }}
    style={styles.line}
  />
);

// The line between the places on the home page. Besides setting them apart, it shows where
// one place ends: a swipe above or below it belongs to another one.
export const Divider: FC<{ testID?: string }> = ({ testID }) => {
  const theme = useThemeColors();
  const dividerStyle = useSettingsStore((state) => state.dividerStyle);
  const dividerColor = useSettingsStore((state) => state.dividerColor);
  if (dividerStyle === "none") return <View style={styles.spacer} testID={testID} />;
  const color = dividerColor === "theme" ? theme.textSecondary : dividerColorValues[dividerColor];

  return (
    <View
      style={styles.divider}
      testID={testID}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {dividerStyle === "fade" && <FadingLine color={color} />}
      {dividerStyle === "simple" && (
        <View style={[styles.line, { backgroundColor: withAlpha(color, 0.45) }]} />
      )}
      {dividerStyle === "double" && (
        <View style={styles.double}>
          <FadingLine color={color} />
          <FadingLine color={color} />
        </View>
      )}
      {dividerStyle === "dotted" && (
        <View style={styles.dots}>
          {[0.15, 0.3, 0.5, 0.7, 0.9, 0.7, 0.5, 0.3, 0.15].map((opacity, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: color, opacity },
                index === 4 && styles.dotBig,
              ]}
            />
          ))}
        </View>
      )}
      {dividerStyle === "ornament" && (
        <View style={styles.ornament}>
          <View style={styles.ornamentSide}>
            <FadingLine color={color} towards="right" />
          </View>
          <View style={[styles.diamond, styles.diamondSmall, { borderColor: color }]} />
          <View style={[styles.diamond, { backgroundColor: withAlpha(color, 0.9) }]} />
          <View style={[styles.diamond, styles.diamondSmall, { borderColor: color }]} />
          <View style={styles.ornamentSide}>
            <FadingLine color={color} towards="left" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  diamond: {
    height: 7,
    marginHorizontal: 4,
    transform: [{ rotate: "45deg" }],
    width: 7,
  },
  diamondSmall: {
    borderWidth: 1,
    height: 4,
    width: 4,
  },
  divider: {
    alignSelf: "stretch",
    justifyContent: "center",
    marginHorizontal: 28,
    paddingVertical: 10,
  },
  dot: {
    borderRadius: 2,
    height: 3,
    width: 3,
  },
  dotBig: {
    borderRadius: 3,
    height: 5,
    width: 5,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  double: {
    gap: 3,
  },
  line: {
    height: StyleSheet.hairlineWidth * 2,
  },
  ornament: {
    alignItems: "center",
    flexDirection: "row",
  },
  ornamentSide: {
    flex: 1,
  },
  spacer: {
    height: 12,
  },
});
