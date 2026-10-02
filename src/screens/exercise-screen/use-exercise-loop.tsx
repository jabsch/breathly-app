import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated } from "react-native";
import { createStepAnimation } from "@breathly/screens/exercise-screen/step-animation";
import { loopSteps } from "@breathly/screens/exercise-screen/step-loop";
import { StepMetadata } from "@breathly/types/step-metadata";

export const useExerciseLoop = (
  stepsMetadata: [StepMetadata, StepMetadata, StepMetadata, StepMetadata],
  initialStepIndex: number,
  onStepStart: (stepIndex: number) => void,
) => {
  const activeSteps = useMemo(() => stepsMetadata.filter((step) => !step.skipped), [stepsMetadata]);
  // Capture the step index once at mount: the session store echoes every step change
  // back into this prop, and reading it live would tear down and restart the loop
  // effect on each step.
  const initialStepIndexRef = useRef(
    Math.min(Math.max(initialStepIndex, 0), Math.max(activeSteps.length - 1, 0)),
  );
  const initialStep = activeSteps[initialStepIndexRef.current];
  const initialExerciseAnimationValue =
    initialStep?.id === "afterInhale" || initialStep?.id === "exhale" ? 1 : 0;
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndexRef.current);
  const textAnimVal = useRef(new Animated.Value(0)).current;
  const exerciseAnimVal = useRef(new Animated.Value(initialExerciseAnimationValue)).current;
  const currentStep: StepMetadata | undefined = activeSteps[currentStepIndex];

  const animateStep = useCallback(
    (toValue: number, durationMs: number) =>
      createStepAnimation({ exerciseAnimVal, textAnimVal, toValue, durationMs }),
    [exerciseAnimVal, textAnimVal],
  );

  useEffect(() => {
    let stepAnimation: Animated.CompositeAnimation | undefined;
    // The clock drives the steps; the animation of each step only follows it.
    const stopExerciseLoop = loopSteps(
      activeSteps.map((step) => step.duration),
      (stepIndex: number) => {
        const step = activeSteps[stepIndex];
        if (!step) return;
        stepAnimation?.stop();
        stepAnimation = animateStep(
          step.id === "inhale" || step.id === "afterInhale" ? 1 : 0,
          step.duration,
        );
        stepAnimation.start();
        setCurrentStepIndex(stepIndex);
        onStepStart(stepIndex);
      },
      initialStepIndexRef.current,
    );
    return () => {
      stopExerciseLoop();
      stepAnimation?.stop();
    };
  }, [activeSteps, animateStep, onStepStart]);

  return { currentStep, exerciseAnimVal, textAnimVal };
};
