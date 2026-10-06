import Ionicons from "@expo/vector-icons/Ionicons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { FC, Fragment, useCallback, useEffect, useMemo, useRef } from "react";
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
import { Divider } from "@breathly/screens/home-screen/divider";
import { HomeMenu } from "@breathly/screens/home-screen/home-menu";
import { PlanetsBackground } from "@breathly/screens/home-screen/planets-background";
import { StarsBackground } from "@breathly/screens/home-screen/stars-background";
import { SwipeCarousel } from "@breathly/screens/home-screen/swipe-carousel";
import { BreathingCard, IconButton, TimerCard } from "@breathly/screens/timers/timer-card";
import { useActiveSessionStore } from "@breathly/stores/active-session";
import { useExperienceDraftStore } from "@breathly/stores/experience-draft";
import {
  carouselTouch,
  homePagePositions,
  useHomePagerStore,
  type HomePage,
} from "@breathly/stores/home-pager";
import { useSettingsStore } from "@breathly/stores/settings";
import type { Experience } from "@breathly/types/experience";
import { resolveBreathingSlot, resolveTimerSlots } from "@breathly/utils/home-slots";

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
  const { width, height } = useWindowDimensions();
  const showStars = useSettingsStore((state) => state.showStars);
  const experiences = useSettingsStore((state) => state.experiences);
  const breathingSlot = useSettingsStore((state) => state.breathingSlot);
  const timerSlotSettings = useSettingsStore((state) => state.timerSlots);
  const timerRows = useSettingsStore((state) => state.timerRows);
  const breathingSectionHeight = useSettingsStore((state) => state.breathingSectionHeight);
  const timerRowHeight = useSettingsStore((state) => state.timerRowHeight);
  const showInBreathingSlot = useSettingsStore((state) => state.showInBreathingSlot);
  const setBreathingSlotLocked = useSettingsStore((state) => state.setBreathingSlotLocked);
  const showInTimerSlot = useSettingsStore((state) => state.showInTimerSlot);
  const setTimerSlotLocked = useSettingsStore((state) => state.setTimerSlotLocked);
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
    // With the stars turned off there is nothing to wait for either.
    if ((colorScheme === "light" || !showStars) && !isHomeScreenReady) {
      markHomeScreenAsReady();
    }
  }, [colorScheme, isHomeScreenReady, markHomeScreenAsReady, showStars]);

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
      // A sideways swipe on a breathing section or timer row cycles it instead.
      if (carouselTouch.active) return false;
      if (Math.abs(dx) < swipeStartDistance || Math.abs(dx) < Math.abs(dy) * swipeDirectionRatio)
        return false;
      const current = homePagePositions[pagerStateRef.current.page];
      // A swipe right moves toward the menu, a swipe left toward the session.
      return dx < 0 ? current < highestPosition() : current > -1;
    };
    return PanResponder.create({
      // The pager sees every touch first; a carousel under the finger sets the flag again.
      onStartShouldSetPanResponderCapture: () => {
        carouselTouch.active = false;
        return false;
      },
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

  const experiencesById = useMemo(
    () => new Map(experiences.map((experience) => [experience.id, experience])),
    [experiences],
  );
  const breathing = resolveBreathingSlot(experiences, breathingSlot);
  const timerSlots = resolveTimerSlots(experiences, timerSlotSettings, timerRows);
  const timerListRef = useRef<ScrollView>(null);
  // Peach on the night sky; on the light background it needs to be darker to be read.
  const accentColor = colorScheme === "dark" ? colors.pastel.orange : "#9A5B3A";

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
        {colorScheme === "dark" && showStars && (
          <StarsBackground
            fullHeight
            size={Math.max(height, width)}
            onImageLoaded={handleStarsBackgroundImageLoaded}
          />
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
        {/* The breathing section is locked to the bottom, with the timers stacked above it:
            the first timer row sits right on it, and more rows scroll up. */}
        <View style={styles.places} testID="home.experiences">
          {timerSlots.length > 0 && (
            <>
              <Divider />
              <ScrollView
                ref={timerListRef}
                style={styles.timerList}
                onContentSizeChange={() => timerListRef.current?.scrollToEnd({ animated: false })}
                testID="home.timers"
              >
                {timerSlots
                  .map((slot, row) => ({ slot, row }))
                  .reverse()
                  .map(({ slot, row }, index) => (
                    <Fragment key={row}>
                      {index > 0 && <Divider />}
                      <SwipeCarousel
                        candidates={slot.candidates}
                        id={slot.id}
                        locked={slot.locked}
                        height={timerRowHeight}
                        onChange={(id) => showInTimerSlot(row, id)}
                        testID={`home.timer-row.${row}`}
                        renderItem={(id, peek) => {
                          const experience = experiencesById.get(id);
                          if (!experience) return null;
                          return (
                            <TimerCard
                              experience={experience}
                              scope={peek ? "peek" : "home"}
                              layout="row"
                              height={timerRowHeight}
                              onEdit={handleEditExperience}
                              accessory={
                                slot.candidates.length > 1 && (
                                  <LockButton
                                    locked={slot.locked}
                                    name={experience.name}
                                    testID={`home.timer-row.${row}.lock`}
                                    onPress={() => setTimerSlotLocked(row, !slot.locked)}
                                  />
                                )
                              }
                            />
                          );
                        }}
                      />
                    </Fragment>
                  ))}
              </ScrollView>
            </>
          )}
          <Divider />
          {breathing ? (
            <SwipeCarousel
              candidates={breathing.candidates}
              id={breathing.id}
              locked={breathing.locked}
              height={breathingSectionHeight}
              onChange={showInBreathingSlot}
              showDots
              testID="home.breathing"
              renderItem={(id, peek) => {
                const experience = experiencesById.get(id);
                if (!experience) return null;
                return (
                  <BreathingCard
                    experience={experience}
                    scope={peek ? "peek" : "home"}
                    layout="section"
                    height={breathingSectionHeight}
                    onEdit={handleEditExperience}
                    accessory={
                      breathing.candidates.length > 1 && (
                        <LockButton
                          locked={breathing.locked}
                          name="the breathing exercise"
                          testID="home.breathing.lock"
                          onPress={() => setBreathingSlotLocked(!breathing.locked)}
                        />
                      )
                    }
                  />
                );
              }}
            />
          ) : (
            <View style={[styles.emptyBreathing, { height: breathingSectionHeight }]}>
              <Text style={[styles.emptyBreathingText, { color: theme.textSecondary }]}>
                Create a breathing experience and it shows here.
              </Text>
            </View>
          )}
        </View>
        {/* Below everything, so it stays at the bottom however many experiences there are. */}
        <Pressable
          style={[styles.createButton, { borderColor: accentColor }]}
          onPress={handleCreateExperiencePress}
          testID="home.create-experience"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={18} color={accentColor} />
          <Text
            adjustsFontSizeToFit
            style={[styles.createLabel, { color: accentColor }]}
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

// Locks a home place on the experience it shows: swiping on it then turns the page instead.
const LockButton: FC<{
  locked: boolean;
  name: string;
  testID: string;
  onPress: () => unknown;
}> = ({ locked, name, testID, onPress }) => (
  <IconButton
    icon={locked ? "lock-closed" : "lock-open-outline"}
    label={locked ? `Unlock swiping on ${name}` : `Lock swiping on ${name}`}
    testID={testID}
    onPress={onPress}
  />
);

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "#000000",
  },
  createButton: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: 20,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  createLabel: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
    letterSpacing: 0.5,
  },
  emptyBreathing: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyBreathingText: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
    textAlign: "center",
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
  places: {
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "flex-end",
  },
  tagline: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
    fontWeight: "300",
    marginBottom: 16,
    textAlign: "center",
  },
  timerList: {
    flexGrow: 0,
    flexShrink: 1,
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
