import React, { FC, useEffect, useRef, useState } from "react";
import { Animated, AppState, StyleSheet } from "react-native";
import { colors } from "@breathly/design/colors";
import { useColorScheme } from "@breathly/design/theme";
import { fontSizes } from "@breathly/design/typography";
import { announceForScreenReader } from "@breathly/screens/exercise-screen/accessibility-announcements";
import {
  getActiveTickDeltaMs,
  getSessionNowMs,
} from "@breathly/screens/exercise-screen/exercise-session";
import { animate } from "@breathly/utils/animate";
import { formatTimer } from "@breathly/utils/format-timer";
import { useInterval } from "@breathly/utils/use-interval";

type Props = {
  countsInBackground: boolean;
  limit: number;
  initialActiveElapsedMs: number;
  onActiveElapsedChange: (elapsedMs: number) => void;
  onLimitReached: () => void;
};

const timerRefreshIntervalMs = 250;
const maximumActiveTickGapMs = timerRefreshIntervalMs * 4;
const showAnimDuration = 500;
const hideAnimDuration = 400;
export const lastBreathLabel = "Last breath";

export const Timer: FC<Props> = ({
  countsInBackground,
  limit,
  initialActiveElapsedMs,
  onActiveElapsedChange,
  onLimitReached,
}) => {
  const isDarkMode = useColorScheme() === "dark";
  const [elapsedTimeMs, setElapsedTimeMs] = useState(initialActiveElapsedMs);
  const elapsedTimeRef = useRef(initialActiveElapsedMs);
  const previousTickAtMs = useRef(getSessionNowMs());
  const opacityAnimVal = useRef(new Animated.Value(0)).current;
  const limitReachedRef = useRef(false);
  const [lastBreathVisible, setLastBreathVisible] = useState(false);

  useInterval(() => {
    const currentTickAtMs = getSessionNowMs();
    const activeTickDeltaMs = getActiveTickDeltaMs(
      previousTickAtMs.current,
      currentTickAtMs,
      countsInBackground || AppState.currentState !== "background",
      maximumActiveTickGapMs,
    );
    previousTickAtMs.current = currentTickAtMs;
    if (activeTickDeltaMs === 0) return;

    const nextElapsedTimeMs = limit
      ? Math.min(elapsedTimeRef.current + activeTickDeltaMs, limit)
      : elapsedTimeRef.current + activeTickDeltaMs;
    elapsedTimeRef.current = nextElapsedTimeMs;
    setElapsedTimeMs(nextElapsedTimeMs);
    onActiveElapsedChange(nextElapsedTimeMs);
  }, timerRefreshIntervalMs);

  const remainingTimeMs = limit ? Math.max(0, limit - elapsedTimeMs) : undefined;
  const limitReached = remainingTimeMs === 0;

  // The exercise continues until the end of the current exhale, thus the clock
  // stays at 00:00 for some seconds. The clock is complete and only the last
  // breath remains: the timer crossfades to that message. It must not fade
  // away, because a blank screen tells the user nothing about the time that the
  // exercise still needs.
  useEffect(() => {
    if (!limitReached) {
      const showAnimation = animate(opacityAnimVal, {
        toValue: 1,
        duration: showAnimDuration,
      });
      showAnimation.start();
      return () => {
        showAnimation.stop();
      };
    }
    const hideAnimation = animate(opacityAnimVal, {
      toValue: 0,
      duration: hideAnimDuration,
    });
    const showAnimation = animate(opacityAnimVal, {
      toValue: 1,
      duration: showAnimDuration,
    });
    hideAnimation.start(({ finished }) => {
      if (!finished) return;
      setLastBreathVisible(true);
      // The clock is not a live region: it changes every second, and a live
      // region would read every change.
      announceForScreenReader(lastBreathLabel);
      showAnimation.start();
    });
    return () => {
      hideAnimation.stop();
      showAnimation.stop();
    };
  }, [limitReached, opacityAnimVal]);

  useEffect(() => {
    if (limitReached && !limitReachedRef.current) {
      limitReachedRef.current = true;
      onLimitReached();
    }
  }, [limitReached, onLimitReached]);

  const containerAnimatedStyle = {
    opacity: opacityAnimVal,
  };

  const clockText =
    remainingTimeMs == null
      ? formatTimer(Math.floor(elapsedTimeMs / 1000))
      : formatTimer(Math.ceil(remainingTimeMs / 1000));
  const timerText = lastBreathVisible ? lastBreathLabel : clockText;

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.Text
        style={[styles.timerText, isDarkMode && styles.timerTextDark]}
        testID="exercise.timer"
      >
        {timerText}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  timerText: {
    ...fontSizes.xxl2,
    color: colors["slate-800"],
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  timerTextDark: {
    color: colors.white,
  },
});
