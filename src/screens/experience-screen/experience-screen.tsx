import { NativeStackScreenProps } from "@react-navigation/native-stack";
import ms from "ms";
import React, { FC, useState } from "react";
import {
  Alert,
  Animated,
  Button,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { patternPresets } from "@breathly/assets/pattern-presets";
import { Pressable } from "@breathly/common/pressable";
import { ExperienceStackParamList } from "@breathly/core/navigator";
import { colors } from "@breathly/design/colors";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { NamePrompt } from "@breathly/screens/experience-screen/name-prompt";
import { SettingsUI } from "@breathly/screens/settings-screen/settings-ui";
import { useActiveSessionStore } from "@breathly/stores/active-session";
import { useExperienceDraftStore } from "@breathly/stores/experience-draft";
import { useSettingsStore } from "@breathly/stores/settings";
import {
  adjustTimeLimit,
  adjustTimerDuration,
  customPatternDurationLimits,
  customPatternStepSizeMs,
  defaultExperienceSettings,
  maximumTimeLimitMs,
  maximumTimerDurationMs,
  minimumTimerDurationMs,
  setCustomPatternStepValue,
  timeLimitStepMs,
} from "@breathly/stores/settings-state";
import { useTimersStore } from "@breathly/stores/timers";
import { customPatternId } from "@breathly/types/experience";
import { GuidedBreathingMode } from "@breathly/types/guided-breathing-mode";
import {
  formatPatternSteps,
  getExperiencePatternName,
  getExperiencePatternSteps,
  noPatternLabel,
  voiceLabels,
} from "@breathly/utils/experience";

const voiceOptions = (Object.keys(voiceLabels) as GuidedBreathingMode[]).map((value) => ({
  value,
  label: voiceLabels[value],
}));

const timerNamePrompt = {
  title: "Name this timer",
  message: "The name goes on its card, like “Sauna timer”.",
};

// Builds a new experience, or edits a saved one, and saves it as a card on the home page.
export const ExperienceRootScreen: FC<
  NativeStackScreenProps<ExperienceStackParamList, "ExperienceRoot">
> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const draft = useExperienceDraftStore((state) => state.draft);
  const editingId = useExperienceDraftStore((state) => state.editingId);
  const update = useExperienceDraftStore((state) => state.update);
  const saveExperience = useSettingsStore((state) => state.saveExperience);
  const deleteExperience = useSettingsStore((state) => state.deleteExperience);
  const stopTimer = useTimersStore((state) => state.stop);
  const activeSessionId = useActiveSessionStore((state) => state.experience?.id);
  const stopSession = useActiveSessionStore((state) => state.stop);
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const [saveAfterName, setSaveAfterName] = useState(false);
  const isTimer = draft.kind === "timer";
  const title = editingId ? "Edit Experience" : "Create Experience";

  React.useEffect(() => {
    navigation.setOptions({ headerTitle: title });
    if (Platform.OS === "ios") {
      navigation.setOptions({
        headerLeft: () => (
          <Button onPress={navigation.goBack} title="Cancel" testID="experience.cancel" />
        ),
      });
    }
  }, [navigation, title]);

  const save = (name = draft.name) => {
    // A saved experience that changed kind leaves nothing behind running as the old one.
    if (editingId && draft.kind !== "timer") stopTimer(editingId);
    if (editingId && draft.kind !== "breathing" && activeSessionId === editingId) stopSession();
    saveExperience(editingId, { ...draft, name });
    navigation.goBack();
  };

  const handleSavePress = () => {
    if (isTimer && draft.name.trim() === "") {
      setSaveAfterName(true);
      setNamePromptVisible(true);
      return;
    }
    save();
  };

  const handleDeletePress = () => {
    if (!editingId) return;
    Alert.alert("Delete this experience?", "Its card goes away from the home page.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          stopTimer(editingId);
          if (activeSessionId === editingId) stopSession();
          deleteExperience(editingId);
          navigation.goBack();
        },
      },
    ]);
  };

  const patternValue = isTimer
    ? noPatternLabel
    : `${getExperiencePatternName(draft)} (${formatPatternSteps(getExperiencePatternSteps(draft))})`;

  return (
    <Animated.View style={styles.screen}>
      <SettingsUI.Header title={title} onBack={navigation.goBack} />
      <ScrollView
        testID="experience.screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
        }}
      >
        <SettingsUI.Section label="Breathing pattern">
          <SettingsUI.LinkItem
            label="Pattern"
            iconName="body"
            iconBackgroundColor="#bfdbfe"
            value={patternValue}
            onPress={() => navigation.navigate("ExperiencePatternPicker")}
            testID="experience.pattern"
          />
          <SettingsUI.LinkItem
            label="Name"
            iconName="pricetag"
            iconBackgroundColor="#fbcfe8"
            value={draft.name !== "" ? draft.name : isTimer ? "Add a name" : "Pattern name"}
            onPress={() => {
              setSaveAfterName(false);
              setNamePromptVisible(true);
            }}
            testID="experience.name"
          />
        </SettingsUI.Section>
        {!isTimer && (
          <>
            <SettingsUI.Section label="Guided breathing">
              <SettingsUI.PickerItem
                label="Voice"
                iconName="volume-medium"
                iconBackgroundColor="#fdba74"
                value={draft.voice}
                options={voiceOptions}
                onValueChange={(value) => update({ voice: value as GuidedBreathingMode })}
                testID="experience.voice"
              />
            </SettingsUI.Section>
            <SettingsUI.Section label="Counting">
              <SettingsUI.SwitchItem
                label="Countdown numbers"
                secondaryLabel="Inhale 4, 3, 2, 1 on screen"
                iconName="list"
                iconBackgroundColor="#c4b5fd"
                value={draft.countdownNumbers}
                onValueChange={(countdownNumbers) => update({ countdownNumbers })}
                testID="experience.countdown-numbers"
              />
              <SettingsUI.SwitchItem
                label="Say the numbers"
                secondaryLabel="A voice counts along with the numbers"
                iconName="chatbubble-ellipses"
                iconBackgroundColor="#fde68a"
                value={draft.speakNumbers}
                onValueChange={(speakNumbers) => update({ speakNumbers })}
                testID="experience.speak-numbers"
              />
              <SettingsUI.SwitchItem
                label="Soft beeps"
                secondaryLabel="A soft beep every second"
                iconName="radio-button-on"
                iconBackgroundColor="#86efac"
                value={draft.softBeeps}
                onValueChange={(softBeeps) => update({ softBeeps })}
                testID="experience.soft-beeps"
              />
            </SettingsUI.Section>
          </>
        )}
        <SettingsUI.Section label="Timer" hideBottomBorderWeb>
          {isTimer ? (
            <SettingsUI.StepperItem
              label="Timer length"
              secondaryLabel="Time in minutes"
              value={draft.timerDurationMs / ms("1 min")}
              iconName="timer"
              iconBackgroundColor="#fb7185"
              onIncrease={() =>
                update({
                  timerDurationMs: adjustTimerDuration(draft.timerDurationMs, timeLimitStepMs),
                })
              }
              onDecrease={() =>
                update({
                  timerDurationMs: adjustTimerDuration(draft.timerDurationMs, -timeLimitStepMs),
                })
              }
              decreaseDisabled={draft.timerDurationMs <= minimumTimerDurationMs}
              increaseDisabled={draft.timerDurationMs >= maximumTimerDurationMs}
              testID="experience.timer-length"
            />
          ) : (
            <SettingsUI.StepperItem
              label="Session length"
              secondaryLabel="Time limit in minutes"
              value={draft.timeLimit > 0 ? draft.timeLimit / ms("1 min") : "∞"}
              iconName="timer"
              iconBackgroundColor="#fb7185"
              onIncrease={() =>
                update({ timeLimit: adjustTimeLimit(draft.timeLimit, timeLimitStepMs) })
              }
              onDecrease={() =>
                update({ timeLimit: adjustTimeLimit(draft.timeLimit, -timeLimitStepMs) })
              }
              decreaseDisabled={draft.timeLimit <= 0}
              increaseDisabled={draft.timeLimit >= maximumTimeLimitMs}
              testID="experience.session-length"
            />
          )}
        </SettingsUI.Section>
        {editingId && (
          <Pressable
            onPress={handleDeletePress}
            accessibilityRole="button"
            style={styles.deleteButton}
            testID="experience.delete"
          >
            <Text style={styles.deleteLabel}>Delete experience</Text>
          </Pressable>
        )}
      </ScrollView>
      {/* Outside the list, so it is always on screen. */}
      <View
        style={[
          styles.footer,
          { borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <Pressable
          style={styles.saveButton}
          onPress={handleSavePress}
          accessibilityRole="button"
          testID="experience.save"
        >
          <Text style={styles.saveLabel}>Save Experience</Text>
        </Pressable>
      </View>
      <NamePrompt
        visible={namePromptVisible}
        title={isTimer ? timerNamePrompt.title : "Name this experience"}
        message={isTimer ? timerNamePrompt.message : "Leave it empty to use the pattern's name."}
        initialName={draft.name}
        requireName={isTimer}
        onCancel={() => setNamePromptVisible(false)}
        onSubmit={(name) => {
          update({ name });
          setNamePromptVisible(false);
          if (saveAfterName) save(name);
        }}
      />
    </Animated.View>
  );
};

export const ExperiencePatternPickerScreen: FC<
  NativeStackScreenProps<ExperienceStackParamList, "ExperiencePatternPicker">
> = ({ navigation }) => {
  const draft = useExperienceDraftStore((state) => state.draft);
  const update = useExperienceDraftStore((state) => state.update);
  const [namePromptVisible, setNamePromptVisible] = useState(false);
  const isTimer = draft.kind === "timer";
  const customPatternEnabled = !isTimer && draft.patternPresetId === customPatternId;

  return (
    <Animated.View style={styles.screen}>
      <SettingsUI.Header title="Breathing Patterns" onBack={navigation.goBack} />
      <ScrollView
        testID="experience.patterns.screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
        }}
      >
        <SettingsUI.Section label="No pattern">
          <SettingsUI.RadioButtonItem
            selected={isTimer}
            onPress={() => {
              LayoutAnimation.easeInEaseOut();
              update({ kind: "timer" });
              setNamePromptVisible(true);
            }}
            label={noPatternLabel}
            secondaryLabel="A plain countdown, like the sauna timer. Any number of them can run at once."
            testID="experience.pattern.no-pattern"
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Custom pattern">
          <SettingsUI.SwitchItem
            label="Custom breathing pattern"
            iconName="person"
            iconBackgroundColor="#60a5fa"
            value={customPatternEnabled}
            onValueChange={(enabled: boolean) => {
              LayoutAnimation.easeInEaseOut();
              update({
                kind: "breathing",
                patternPresetId: enabled
                  ? customPatternId
                  : defaultExperienceSettings.patternPresetId,
              });
            }}
            testID="experience.custom-pattern"
          />
          {customPatternEnabled &&
            draft.customPatternSteps.map((stepValue, stepIndex) => {
              const limits = customPatternDurationLimits[stepIndex];
              if (!limits) return null;

              const [lowerLimit, upperLimit] = limits;
              const stepLabel = ["Inhale", "Hold after inhale", "Exhale", "Hold after exhale"][
                stepIndex
              ];
              return (
                <SettingsUI.StepperItem
                  key={stepIndex}
                  label={stepLabel}
                  value={stepValue / ms("1 sec")}
                  fractionDigits={1}
                  secondaryLabel={"Time in seconds"}
                  decreaseDisabled={stepValue <= lowerLimit}
                  increaseDisabled={stepValue >= upperLimit}
                  onIncrease={() =>
                    update({
                      customPatternSteps: setCustomPatternStepValue(
                        draft.customPatternSteps,
                        stepIndex,
                        stepValue + customPatternStepSizeMs,
                      ),
                    })
                  }
                  onDecrease={() =>
                    update({
                      customPatternSteps: setCustomPatternStepValue(
                        draft.customPatternSteps,
                        stepIndex,
                        stepValue - customPatternStepSizeMs,
                      ),
                    })
                  }
                  testID={`experience.custom-pattern.step.${stepIndex}`}
                />
              );
            })}
        </SettingsUI.Section>
        <SettingsUI.Section label="Pattern presets" hideBottomBorderWeb>
          {patternPresets.map((patternPreset) => (
            <SettingsUI.RadioButtonItem
              key={patternPreset.id}
              disabled={customPatternEnabled}
              selected={!isTimer && draft.patternPresetId === patternPreset.id}
              onPress={() => update({ kind: "breathing", patternPresetId: patternPreset.id })}
              label={`${patternPreset.name} (${formatPatternSteps(patternPreset.steps)})`}
              secondaryLabel={patternPreset.description}
              testID={`experience.pattern.${patternPreset.id}`}
            />
          ))}
        </SettingsUI.Section>
      </ScrollView>
      <NamePrompt
        visible={namePromptVisible}
        title={timerNamePrompt.title}
        message={timerNamePrompt.message}
        initialName={draft.name}
        requireName
        onCancel={() => setNamePromptVisible(false)}
        onSubmit={(name) => {
          update({ name });
          setNamePromptVisible(false);
          navigation.goBack();
        }}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  deleteButton: {
    alignItems: "center",
    marginVertical: 24,
    paddingVertical: 12,
  },
  deleteLabel: {
    ...fontSizes.base,
    color: colors["red-400"],
    fontFamily: fontFamilies.medium,
  },
  footer: {
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.pastel["orange-light"],
    borderRadius: 8,
    maxWidth: 320,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  saveLabel: {
    ...fontSizes.lg,
    color: colors["slate-800"],
    fontFamily: fontFamilies.regular,
  },
  screen: {
    flex: 1,
    width: "100%",
  },
});
