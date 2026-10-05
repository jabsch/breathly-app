import React, { FC, ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { useThemeColors } from "@breathly/design/theme";
import { carouselTouch } from "@breathly/stores/home-pager";
import { cycleSlot } from "@breathly/utils/home-slots";

// Same feel as the page swipes: a drag counts once it moves this far, mostly sideways.
const swipeStartDistance = 16;
const swipeDirectionRatio = 1.5;
const swipeVelocityThreshold = 0.4;

interface SwipeCarouselProps {
  candidates: string[];
  id: string;
  locked: boolean;
  height: number;
  onChange: (id: string) => unknown;
  // `peek` is true for the neighbours drawn beside it while a swipe drags them in.
  renderItem: (id: string, peek: boolean) => ReactNode;
  showDots?: boolean;
  testID?: string;
}

// One saved experience at a time, in a place of fixed height. Swiping left brings the next one
// and swiping right the previous one, both wrapping around. Locked, it holds still, and the
// swipe turns the page instead.
export const SwipeCarousel: FC<SwipeCarouselProps> = ({
  candidates,
  id,
  locked,
  height,
  onChange,
  renderItem,
  showDots,
  testID,
}) => {
  const theme = useThemeColors();
  const [width, setWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const canSwipe = !locked && candidates.length > 1 && width > 0;
  const previousId = cycleSlot(candidates, id, -1);
  const nextId = cycleSlot(candidates, id, 1);

  // The responder is built once and reads the rest from here.
  const stateRef = useRef({ canSwipe, width, previousId, nextId, onChange });
  stateRef.current = { canSwipe, width, previousId, nextId, onChange };

  // The swipe that brought this one in ended with it slid into place; draw it there before the
  // next frame, so it never flashes back to where the old one was.
  useLayoutEffect(() => {
    translateX.setValue(0);
  }, [id, translateX]);

  const panResponder = useMemo(() => {
    const isSwipe = (dx: number, dy: number) =>
      stateRef.current.canSwipe &&
      Math.abs(dx) >= swipeStartDistance &&
      Math.abs(dx) >= Math.abs(dy) * swipeDirectionRatio;
    const settle = () =>
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        overshootClamping: true,
        speed: 18,
        bounciness: 0,
      }).start();
    return PanResponder.create({
      // Runs on the way down to the touched view, after the pager reset the flag.
      onStartShouldSetPanResponderCapture: () => {
        carouselTouch.active = stateRef.current.canSwipe;
        return false;
      },
      onMoveShouldSetPanResponderCapture: (_event, gesture) => isSwipe(gesture.dx, gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gesture) => translateX.setValue(gesture.dx),
      onPanResponderRelease: (_event, gesture) => {
        const { width: itemWidth, previousId: previous, nextId: next } = stateRef.current;
        const direction =
          gesture.dx < -itemWidth / 4 || gesture.vx < -swipeVelocityThreshold
            ? 1
            : gesture.dx > itemWidth / 4 || gesture.vx > swipeVelocityThreshold
              ? -1
              : 0;
        if (direction === 0) {
          settle();
          return;
        }
        Animated.timing(translateX, {
          toValue: -direction * itemWidth,
          duration: 180,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) stateRef.current.onChange(direction === 1 ? next : previous);
          else settle();
        });
      },
      onPanResponderTerminate: settle,
    });
  }, [translateX]);

  const index = Math.max(0, candidates.indexOf(id));

  return (
    <View
      style={[styles.carousel, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      testID={testID}
      {...panResponder.panHandlers}
    >
      <Animated.View style={[styles.track, { transform: [{ translateX }] }]}>
        {canSwipe && (
          <Peek offset={-width} width={width}>
            {renderItem(previousId, true)}
          </Peek>
        )}
        <View style={[styles.item, { width: width || "100%" }]}>{renderItem(id, false)}</View>
        {canSwipe && (
          <Peek offset={width} width={width}>
            {renderItem(nextId, true)}
          </Peek>
        )}
      </Animated.View>
      {showDots && candidates.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {candidates.map((candidate, dotIndex) => (
            <View
              key={candidate}
              style={[
                styles.dot,
                { backgroundColor: theme.textSecondary },
                dotIndex === index && styles.dotSelected,
                locked && dotIndex !== index && styles.dotLocked,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const Peek: FC<{ offset: number; width: number; children: ReactNode }> = ({
  offset,
  width,
  children,
}) => (
  <View
    style={[styles.item, styles.peek, { left: offset, width }]}
    pointerEvents="none"
    importantForAccessibility="no-hide-descendants"
    accessibilityElementsHidden
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  carousel: {
    alignSelf: "stretch",
    overflow: "hidden",
  },
  dot: {
    borderRadius: 3,
    height: 5,
    opacity: 0.35,
    width: 5,
  },
  dotLocked: {
    opacity: 0.12,
  },
  dotSelected: {
    opacity: 0.9,
    width: 14,
  },
  dots: {
    bottom: 6,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  item: {
    height: "100%",
  },
  peek: {
    position: "absolute",
    top: 0,
  },
  track: {
    flex: 1,
  },
});
