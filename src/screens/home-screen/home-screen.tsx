import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { FC, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  BackHandler,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { Pressable } from "@breathly/common/pressable";
import { RootStackParamList } from "@breathly/core/navigator";
import { colors } from "@breathly/design/colors";
import { useColorScheme, useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { ExercisePanel } from "@breathly/screens/exercise-screen/exercise-screen";
import { HomeMenu } from "@breathly/screens/home-screen/home-menu";
import { PlanetsBackground } from "@breathly/screens/home-screen/planets-background";
import { StarsBackground } from "@breathly/screens/home-screen/stars-background";
import { ExperienceCard } from "@breathly/screens/timers/timer-card";
import { useActiveSessionStore } from "@breathly/stores/active-session";
import { useExperienceDraftStore } from "@breathly/stores/experience-draft";
import { homePagePositions, useHomePagerStore, type HomePage } from "@breathly/stores/home-pager";
import { useSettingsStore } from "@breathly/stores/settings";
import type { Experience } from "@breathly/types/experience";

export const useHomeScreenStatusStore = create<{
  isHomeScreenReady: boolean;
  markHomeScreenAsReady: () => unknown;
}>((set) => ({
  isHomeScreenReady: false,
  markHomeScreenAsReady: () => set(() => ({ isHomeScreenReady: true })),
}));

// A drag counts as a page swipe once it has moved this far, mostly sideways: anything more
// vertical belongs to the list of cards.
const swipeStartDistance = 16;
const swipeDirectionRatio = 1.5;
const swipeVelocityThreshold = 0.4;
const pageOrder: HomePage[] = ["menu", "home", "exercise"];
const menuWidthMax = 320;

export const HomeScreen: FC<NativeStackScreenProps<RootStackParamList, "Home">> = ({
  navigation,
}) => {
  const colorScheme = useColorScheme();
  const theme = useThemeColors();
  const { isHomeScreenReady, markHomeScreenAsReady } = useHomeScreenStatusStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const experiences = useSettingsStore((state) => state.experiences);
  const activeExperience = useActiveSessionStore((state) => state.experience);
  const runId = useActiveSessionStore((state) => state.runId);
  const beginDraft = useExperienceDraftStore((state) => state.begin);
  const page = useHomePagerStore((state) => state.page);
  const setPage = useHomePagerStore((state) => state.setPage);
  const hasExercise = activeExperience != null;
  const menuWidth = Math.min(menuWidthMax, width * 0.82);

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

  // The pages sit side by side: -1 is the menu, 0 the cards, 1 the session.
  const position = useRef(new Animated.Value(homePagePositions[page])).current;

  // A session that ends leaves no page to stay on.
  useEffect(() => {
    if (!hasExercise && page === "exercise") setPage("home");
  }, [hasExercise, page, setPage]);

  useEffect(() => {
    const animation = Animated.spring(position, {
      toValue: homePagePositions[page],
      useNativeDriver: true,
      overshootClamping: true,
      speed: 18,
      bounciness: 0,
    });
    animation.start();
    return () => animation.stop();
  }, [page, position]);

  // Back goes to the cards first, the way a swipe would; the session keeps running.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.isFocused() || useHomePagerStore.getState().page === "home") return false;
      setPage("home");
      return true;
    });
    return () => subscription.remove();
  }, [navigation, setPage]);

  // The responder reads these on every move: it is built once.
  const pagerStateRef = useRef({ page, hasExercise, width });
  pagerStateRef.current = { page, hasExercise, width };
  const dragStartRef = useRef(0);

  const panResponder = useMemo(() => {
    const highestPosition = () => (pagerStateRef.current.hasExercise ? 1 : 0);
    const isPageSwipe = (dx: number, dy: number) => {
      if (Math.abs(dx) < swipeStartDistance || Math.abs(dx) < Math.abs(dy) * swipeDirectionRatio)
        return false;
      const current = homePagePositions[pagerStateRef.current.page];
      // A swipe right moves toward the menu, a swipe left toward the session.
      return dx < 0 ? current < highestPosition() : current > -1;
    };
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) => isPageSwipe(gesture.dx, gesture.dy),
      onPanResponderGrant: () => {
        position.stopAnimation((value) => {
          dragStartRef.current = value;
        });
      },
      onPanResponderMove: (_event, gesture) => {
        const next = dragStartRef.current - gesture.dx / pagerStateRef.current.width;
        position.setValue(Math.min(highestPosition(), Math.max(-1, next)));
      },
      onPanResponderRelease: (_event, gesture) => {
        const { width: pageWidth, page: currentPage } = pagerStateRef.current;
        const current = homePagePositions[currentPage];
        let target = current;
        if (gesture.dx < -pageWidth / 4 || gesture.vx < -swipeVelocityThreshold) target += 1;
        else if (gesture.dx > pageWidth / 4 || gesture.vx > swipeVelocityThreshold) target -= 1;
        target = Math.min(highestPosition(), Math.max(-1, target));
        const targetPage = pageOrder[target + 1] ?? "home";
        if (targetPage === currentPage) {
          Animated.spring(position, {
            toValue: target,
            useNativeDriver: true,
            overshootClamping: true,
            speed: 18,
            bounciness: 0,
          }).start();
        }
        useHomePagerStore.getState().setPage(targetPage);
      },
      onPanResponderTerminate: () => {
        Animated.spring(position, {
          toValue: homePagePositions[pagerStateRef.current.page],
          useNativeDriver: true,
          overshootClamping: true,
        }).start();
      },
    });
  }, [position]);

  const handleCreateExperiencePress = () => {
    beginDraft();
    navigation.navigate("Experience", { screen: "ExperienceRoot" });
  };
  const handleEditExperience = useCallback(
    (experience: Experience) => {
      beginDraft(experience);
      navigation.navigate("Experience", { screen: "ExperienceRoot" });
    },
    [beginDraft, navigation],
  );

  const homeTranslateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width],
    extrapolate: "clamp",
  });
  const exerciseTranslateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
    extrapolate: "clamp",
  });
  const menuTranslateX = position.interpolate({
    inputRange: [-1, 0],
    outputRange: [0, -menuWidth],
    extrapolate: "clamp",
  });
  const backdropOpacity = position.interpolate({
    inputRange: [-1, 0],
    outputRange: [0.5, 0],
    extrapolate: "clamp",
  });

  const safeAreaPadding = {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
  const hiddenFromAccessibility = (shown: boolean) =>
    shown ? ("auto" as const) : ("no-hide-descendants" as const);

  return (
    <View
      style={[styles.pager, { backgroundColor: theme.background }]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        testID={page === "home" ? "home.screen" : undefined}
        pointerEvents={page === "home" ? "auto" : "none"}
        importantForAccessibility={hiddenFromAccessibility(page === "home")}
        accessibilityElementsHidden={page !== "home"}
        style={[
          styles.page,
          safeAreaPadding,
          { backgroundColor: theme.background, transform: [{ translateX: homeTranslateX }] },
        ]}
      >
        {colorScheme === "dark" && (
          <StarsBackground onImageLoaded={handleStarsBackgroundImageLoaded} />
        )}
        {colorScheme === "light" && <PlanetsBackground />}

        <View style={styles.topBar}>
          <Pressable
            onPress={() => setPage("menu")}
            accessibilityRole="button"
            accessibilityLabel="Open the menu"
            testID="home.menu"
            style={styles.menuButton}
          >
            <Ionicons name="menu" size={26} color={theme.control} />
          </Pressable>
        </View>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, colorScheme === "dark" && styles.titleDark]}>Breathly</Text>
          <Text style={[styles.tagline, { color: theme.textSecondary }]}>
            Relax, focus on your breath, and find your inner peace.
          </Text>
        </View>
        <ScrollView
          style={styles.cardList}
          contentContainerStyle={styles.cardListContent}
          testID="home.experiences"
        >
          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              scope="home"
              onEdit={handleEditExperience}
            />
          ))}
        </ScrollView>
        {/* Outside the list, so it stays at the bottom however many cards there are. */}
        <Pressable
          style={[styles.button, styles.createButton]}
          onPress={handleCreateExperiencePress}
          testID="home.create-experience"
          accessibilityRole="button"
        >
          <Text
            adjustsFontSizeToFit
            style={styles.buttonLabel}
            maxFontSizeMultiplier={1.2}
            minimumFontScale={0.85}
            numberOfLines={1}
          >
            Create Experience
          </Text>
        </Pressable>
      </Animated.View>

      {activeExperience && (
        <Animated.View
          pointerEvents={page === "exercise" ? "auto" : "none"}
          importantForAccessibility={hiddenFromAccessibility(page === "exercise")}
          accessibilityElementsHidden={page !== "exercise"}
          style={[
            styles.page,
            { backgroundColor: theme.background, transform: [{ translateX: exerciseTranslateX }] },
          ]}
        >
          <ExercisePanel key={runId} experience={activeExperience} visible={page === "exercise"} />
        </Animated.View>
      )}

      <Animated.View
        pointerEvents={page === "menu" ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPage("home")}
          accessibilityLabel="Close the menu"
          testID="home.menu-backdrop"
        />
      </Animated.View>
      <Animated.View
        pointerEvents={page === "menu" ? "auto" : "none"}
        importantForAccessibility={hiddenFromAccessibility(page === "menu")}
        accessibilityElementsHidden={page !== "menu"}
        style={[
          styles.menu,
          safeAreaPadding,
          {
            width: menuWidth,
            backgroundColor: theme.surface,
            transform: [{ translateX: menuTranslateX }],
          },
        ]}
      >
        <HomeMenu
          onNavigate={(route) => {
            setPage("home");
            navigation.navigate(route);
          }}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000000",
  },
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
  cardList: {
    alignSelf: "stretch",
    flex: 1,
  },
  cardListContent: {
    alignItems: "center",
    paddingTop: 8,
  },
  createButton: {
    backgroundColor: colors.pastel["orange-light"],
    marginBottom: 32,
    marginTop: 12,
  },
  menu: {
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
  },
  menuButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  page: {
    alignItems: "center",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  pager: {
    flex: 1,
    overflow: "hidden",
  },
  tagline: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
    fontWeight: "300",
    marginBottom: 16,
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
    marginHorizontal: 48,
    marginTop: 24,
  },
  titleDark: {
    color: colors.white,
  },
  topBar: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 8,
    paddingTop: 4,
  },
});
