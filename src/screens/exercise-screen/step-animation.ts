import { Animated } from "react-native";
import { animate } from "@breathly/utils/animate";

const maximumTextAnimDurationMs = 400;
// The label fades in at the start of the step and out at its end, and both fades
// use the same animated value. A fade out that starts before the fade in ends
// stops the fade in, thus the label never becomes readable. The two fades
// together must therefore stay inside the step.
const maximumTextAnimStepRatio = 0.35;

export const getTextAnimDurationMs = (stepDurationMs: number) =>
  Math.max(0, Math.min(maximumTextAnimDurationMs, stepDurationMs * maximumTextAnimStepRatio));

interface StepAnimationOptions {
  exerciseAnimVal: Animated.Value;
  textAnimVal: Animated.Value;
  toValue: number;
  durationMs: number;
}

export const createStepAnimation = ({
  exerciseAnimVal,
  textAnimVal,
  toValue,
  durationMs,
}: StepAnimationOptions): Animated.CompositeAnimation => {
  const textAnimDurationMs = getTextAnimDurationMs(durationMs);
  // `stopTogether` stays at its default. The ratio above already keeps the two fades inside
  // the step, so nothing interrupts the circle and the flag has no work to do — but it would
  // make an interrupted circle report `finished: true`, which hides the interruption.
  return Animated.stagger(Math.max(0, durationMs - textAnimDurationMs), [
    Animated.parallel([
      animate(exerciseAnimVal, {
        toValue: toValue,
        duration: durationMs,
      }),
      animate(textAnimVal, {
        toValue: 1,
        duration: textAnimDurationMs,
      }),
    ]),
    animate(textAnimVal, {
      toValue: 0,
      duration: textAnimDurationMs,
    }),
  ]);
};
