import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { FC, useCallback, useEffect } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { Pressable } from "@breathly/common/pressable";
import { RootStackParamList } from "@breathly/core/navigator";
import { colors } from "@breathly/design/colors";
import { useColorScheme, useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { PlanetsBackground } from "@breathly/screens/home-screen/planets-background";
import { StarsBackground } from "@breathly/screens/home-screen/stars-background";
import { SaunaTimer } from "@breathly/screens/sauna/sauna-timer";

export const useHomeScreenStatusStore = create<{
  isHomeScreenReady: boolean;
  markHomeScreenAsReady: () => unknown;
}>((set) => ({
  isHomeScreenReady: false,
  markHomeScreenAsReady: () => set(() => ({ isHomeScreenReady: true })),
}));

export const HomeScreen: FC<NativeStackScreenProps<RootStackParamList, "Home">> = ({
  navigation,
}) => {
  const colorScheme = useColorScheme();
  const theme = useThemeColors();
  const { isHomeScreenReady, markHomeScreenAsReady } = useHomeScreenStatusStore();
  const insets = useSafeAreaInsets();
  const handleStartButtonPress = () => {
    navigation.navigate("Exercise");
  };
  const handleCustomizeButtonPress = () => {
    navigation.navigate("Settings");
  };

  // To avoid weird flashes we store a flag to track if the home screen has been fully rendered.
  // This flag is used to tell to `SplashScreenManager` when to hide the splash screen.
  useEffect(() => {
    // We run this only in light mode, because for dark mode we'll mark the flag only after
    // the stars background has been loaded.
    if (colorScheme === "light" && !isHomeScreenReady) {
      markHomeScreenAsReady();
    }
  }, [colorScheme, isHomeScreenReady, markHomeScreenAsReady]);

  const handleStarsBackgroundImageLoaded = useCallback(() => {
    if (!isHomeScreenReady) {
      markHomeScreenAsReady();
    }
  }, [isHomeScreenReady, markHomeScreenAsReady]);

  return (
    <Animated.View
      testID="home.screen"
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
      {colorScheme === "dark" && (
        <StarsBackground onImageLoaded={handleStarsBackgroundImageLoaded} />
      )}
      {colorScheme === "light" && <PlanetsBackground />}

      <View style={styles.titleBlock}>
        <Animated.Text style={[styles.title, colorScheme === "dark" && styles.titleDark]}>
          Breathly
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { color: theme.textSecondary }]}>
          Relax, focus on your breath, and find your inner peace.
        </Animated.Text>
      </View>
      <SaunaTimer />
      <Pressable
        style={[styles.button, styles.startButton]}
        onPress={handleStartButtonPress}
        testID="home.start-session"
        accessibilityRole="button"
      >
        <Text
          adjustsFontSizeToFit
          style={styles.buttonLabel}
          maxFontSizeMultiplier={1.2}
          minimumFontScale={0.85}
          numberOfLines={1}
        >
          Start a new session
        </Text>
      </Pressable>
      <Animated.Text style={[styles.separator, { color: theme.textSecondary }]}>or</Animated.Text>
      <Pressable
        style={[
          styles.button,
          styles.customizeButton,
          // A pale slab glares on the night sky: in the dark the secondary action is an
          // outline, so the warm start button stays the one thing that stands out.
          colorScheme === "dark" && [styles.customizeButtonDark, { borderColor: theme.border }],
        ]}
        onPress={handleCustomizeButtonPress}
        testID="home.customize"
        accessibilityRole="button"
      >
        <Text
          adjustsFontSizeToFit
          style={[styles.buttonLabel, colorScheme === "dark" && { color: theme.text }]}
          maxFontSizeMultiplier={1.2}
          minimumFontScale={0.85}
          numberOfLines={1}
        >
          Customize the experience
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: 288,
  },
  buttonLabel: {
    ...fontSizes.lg,
    color: colors["slate-800"],
    fontFamily: fontFamilies.regular,
    paddingVertical: 4,
    textAlign: "center",
    width: "100%",
  },
  customizeButton: {
    backgroundColor: colors.pastel["gray-light"],
    marginBottom: 80,
  },
  customizeButtonDark: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  screen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
  },
  separator: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
    fontWeight: "300",
    marginVertical: 8,
    textAlign: "center",
  },
  startButton: {
    backgroundColor: colors.pastel["orange-light"],
  },
  tagline: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
    fontWeight: "300",
    marginBottom: 32,
    textAlign: "center",
  },
  title: {
    ...fontSizes.xxl5,
    color: colors["slate-800"],
    fontFamily: fontFamilies.serifSemibold,
    includeFontPadding: true,
    lineHeight: 80,
    paddingBottom: 8,
    textAlignVertical: "center",
  },
  titleBlock: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    marginHorizontal: 48,
  },
  titleDark: {
    color: colors.white,
  },
});
