import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import ms from "ms";
import React, { FC, useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet } from "react-native";
import { images } from "@breathly/assets/images";
import { widestDeviceDimension } from "@breathly/design/metrics";
import { animate } from "@breathly/utils/animate";
import { useReduceMotion } from "@breathly/utils/use-accessibility-preferences";

const BACKGROUND_ANIM_DURATION = ms("2 min");

interface Props {
  fadeIn?: boolean;
  // Fills the screen and fades out gradually from the top to the bottom, instead of ending
  // in a short fade below the top part.
  fullHeight?: boolean;
  onImageLoaded?: () => unknown;
  size?: number;
}

export const StarsBackground: FC<Props> = ({
  fadeIn,
  fullHeight,
  onImageLoaded,
  size = widestDeviceDimension * 0.6,
}) => {
  const reduceMotionEnabled = useReduceMotion();
  const backgroundAnimValue = useRef(new Animated.Value(0)).current;
  const fadeInAnimValue = useRef(new Animated.Value(fadeIn ? 0 : 1)).current;

  useEffect(() => {
    // The sky drifts for as long as it is on screen, which makes it the one piece of
    // continuous motion left when the user asks the system for less of it. Hold it still;
    // the star field itself is the point, not the drift.
    if (reduceMotionEnabled) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundAnimValue, {
          toValue: 1,
          duration: BACKGROUND_ANIM_DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(backgroundAnimValue, {
          toValue: 0,
          duration: BACKGROUND_ANIM_DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [backgroundAnimValue, reduceMotionEnabled]);

  const backgroundTransform = [
    {
      translateX: backgroundAnimValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -size],
        extrapolate: "clamp",
      }),
    },
    {
      translateY: backgroundAnimValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -size],
        extrapolate: "clamp",
      }),
    },
  ];

  const handleLoad = () => {
    onImageLoaded?.();
    if (fadeIn) {
      animate(fadeInAnimValue, { toValue: 1, duration: 600 }).start();
    }
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { height: size, opacity: fadeInAnimValue }]}
    >
      <MaskedView
        style={styles.mask}
        maskElement={
          fullHeight ? (
            <LinearGradient
              colors={["black", "rgba(0, 0, 0, 0.55)", "rgba(0, 0, 0, 0.18)", "transparent"]}
              locations={[0, 0.45, 0.8, 1]}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          ) : (
            <LinearGradient
              colors={["black", "transparent"]}
              style={{ flex: 1 }}
              start={{ x: 0, y: 0.7 }}
              end={{ x: 0, y: 0.9 }}
            />
          )
        }
      >
        <Animated.View
          style={[{ height: size * 2, width: size * 2 }, { transform: backgroundTransform }]}
        >
          <Image
            style={styles.image}
            source={images.starsBackgroundHorizontal}
            resizeMode="cover"
            onLoad={handleLoad}
            onError={onImageLoaded}
          />
        </Animated.View>
      </MaskedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
  },
  image: {
    height: "100%",
    position: "absolute",
    top: 0,
    width: "100%",
    zIndex: 10,
  },
  mask: {
    flex: 1,
  },
});
