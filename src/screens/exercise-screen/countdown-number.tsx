import React, { FC, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "@breathly/design/colors";
import { shortestDeviceDimension } from "@breathly/design/metrics";
import { useColorScheme } from "@breathly/design/theme";
import { fontFamilies } from "@breathly/design/typography";
import { useReduceMotion } from "@breathly/utils/use-accessibility-preferences";

const fontSize = Math.round(shortestDeviceDimension * 0.24);

// The seconds left in the step, large, in the middle of the breathing circle. Each new number
// swells in and settles over most of its second, a slow pulse in time with the count; with less
// motion asked of the system, it only fades in.
export const CountdownNumber: FC<{ value: number }> = ({ value }) => {
  const isDarkMode = useColorScheme() === "dark";
  const reduceMotionEnabled = useReduceMotion();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pulse.setValue(0);
    const animation = Animated.timing(pulse, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [pulse, value]);

  const opacity = pulse.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.35, 1, 0.85] });
  const scale = pulse.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1.18, 1.04, 1] });

  return (
    <View
      style={styles.overlay}
      pointerEvents="none"
      // The step label already tells a screen reader how long the step lasts.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Animated.Text
        style={[
          styles.number,
          isDarkMode ? styles.numberDark : styles.numberLight,
          { opacity, transform: reduceMotionEnabled ? [] : [{ scale }] },
        ]}
        testID="exercise.countdown"
      >
        {value}
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  number: {
    fontFamily: fontFamilies.serifMedium,
    fontSize,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
    letterSpacing: 1,
    lineHeight: fontSize * 1.2,
    textAlign: "center",
    // A soft glow, so the number reads over the circles without a box behind it.
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  numberDark: {
    color: colors.white,
    textShadowColor: "rgba(242, 202, 173, 0.75)",
  },
  numberLight: {
    color: colors["slate-800"],
    textShadowColor: "rgba(255, 255, 255, 0.9)",
  },
  overlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
