import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { FC } from "react";
import { Animated, ScrollView, Button, Platform, StyleSheet } from "react-native";
import { SettingsStackParamList } from "@breathly/core/navigator";
import { useColorScheme } from "@breathly/design/theme";
import { dividerColorLabels, dividerStyleLabels } from "@breathly/screens/home-screen/divider";
import { SettingsUI } from "@breathly/screens/settings-screen/settings-ui";
import { useSettingsStore } from "@breathly/stores/settings";
import {
  breathingSectionHeightLimits,
  dividerColors,
  dividerStyles,
  timerRowHeightLimits,
  timerRowsOptions,
  volumeStepPercent,
  type DividerColor,
  type DividerStyle,
  type OtherAudioMode,
  type Theme,
  type TimerRowsSetting,
} from "@breathly/stores/settings-state";

const otherAudioOptions: { value: OtherAudioMode; label: string }[] = [
  { value: "keep", label: "Keep playing" },
  { value: "lower", label: "Lower" },
  { value: "pause", label: "Pause" },
];

const timerRowsLabel = (value: TimerRowsSetting) =>
  value === 0 ? "Off" : value === "all" ? "All, scrolling up" : `${value}`;

// The picker works with strings; "0" and "all" go back to what they stand for.
const parseTimerRows = (value: string): TimerRowsSetting =>
  value === "all" ? "all" : (Number(value) as TimerRowsSetting);

// The app-wide settings, from the menu. What a session does (pattern, voice, length, counting)
// belongs to each saved experience instead.
export const SettingsRootScreen: FC<
  NativeStackScreenProps<SettingsStackParamList, "SettingsRoot">
> = ({ navigation }) => {
  const shouldFollowSystemDarkMode = useSettingsStore((state) => state.shouldFollowSystemDarkMode);
  const setShouldFollowSystemDarkMode = useSettingsStore(
    (state) => state.setShouldFollowSystemDarkMode,
  );
  const theme = useSettingsStore((state) => state.theme);
  const resolvedColorScheme = useColorScheme();
  const setTheme = useSettingsStore((state) => state.setTheme);
  const vibrationEnabled = useSettingsStore((state) => state.vibrationEnabled);
  const setVibrationEnabled = useSettingsStore((state) => state.setVibrationEnabled);
  const voiceVolume = useSettingsStore((state) => state.voiceVolume);
  const voiceOtherAudio = useSettingsStore((state) => state.voiceOtherAudio);
  const beepOtherAudio = useSettingsStore((state) => state.beepOtherAudio);
  const adjustVoiceVolume = useSettingsStore((state) => state.adjustVoiceVolume);
  const showStars = useSettingsStore((state) => state.showStars);
  const setShowStars = useSettingsStore((state) => state.setShowStars);
  const showBreathingAnimation = useSettingsStore((state) => state.showBreathingAnimation);
  const setShowBreathingAnimation = useSettingsStore((state) => state.setShowBreathingAnimation);
  const setCueOtherAudio = useSettingsStore((state) => state.setCueOtherAudio);
  const timerRows = useSettingsStore((state) => state.timerRows);
  const setTimerRows = useSettingsStore((state) => state.setTimerRows);
  const breathingSectionHeight = useSettingsStore((state) => state.breathingSectionHeight);
  const adjustBreathingSectionHeight = useSettingsStore(
    (state) => state.adjustBreathingSectionHeight,
  );
  const timerRowHeight = useSettingsStore((state) => state.timerRowHeight);
  const adjustTimerRowHeight = useSettingsStore((state) => state.adjustTimerRowHeight);
  const dividerStyle = useSettingsStore((state) => state.dividerStyle);
  const setDividerStyle = useSettingsStore((state) => state.setDividerStyle);
  const dividerColor = useSettingsStore((state) => state.dividerColor);
  const setDividerColor = useSettingsStore((state) => state.setDividerColor);

  React.useEffect(() => {
    if (Platform.OS === "ios") {
      navigation.setOptions({
        headerRight: () => (
          <Button onPress={navigation.goBack} title="Done" testID="settings.done" />
        ),
      });
    }
  }, [navigation]);

  return (
    <Animated.View style={styles.screen}>
      <SettingsUI.Header title="Settings" onBack={navigation.goBack} />
      <ScrollView
        testID="settings.screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: Platform.OS === "android" ? undefined : 18,
        }}
      >
        <SettingsUI.Section label="Home screen">
          <SettingsUI.StepperItem
            label="Breathing height"
            secondaryLabel="The breathing section at the bottom"
            iconName="resize"
            iconBackgroundColor="#fdba74"
            value={breathingSectionHeight}
            onIncrease={() => adjustBreathingSectionHeight(1)}
            onDecrease={() => adjustBreathingSectionHeight(-1)}
            decreaseDisabled={breathingSectionHeight <= breathingSectionHeightLimits[0]}
            increaseDisabled={breathingSectionHeight >= breathingSectionHeightLimits[1]}
            testID="settings.breathing-height"
          />
          <SettingsUI.PickerItem
            label="Timer rows"
            secondaryLabel="How many timers show above the breathing"
            iconName="timer"
            iconBackgroundColor="#86efac"
            value={String(timerRows)}
            options={timerRowsOptions.map((option) => ({
              value: String(option),
              label: timerRowsLabel(option),
            }))}
            onValueChange={(value) => setTimerRows(parseTimerRows(value))}
            testID="settings.timer-rows"
          />
          <SettingsUI.StepperItem
            label="Timer row height"
            secondaryLabel="Each timer row"
            iconName="resize"
            iconBackgroundColor="#86efac"
            value={timerRowHeight}
            onIncrease={() => adjustTimerRowHeight(1)}
            onDecrease={() => adjustTimerRowHeight(-1)}
            decreaseDisabled={timerRowHeight <= timerRowHeightLimits[0]}
            increaseDisabled={timerRowHeight >= timerRowHeightLimits[1]}
            testID="settings.timer-row-height"
          />
          <SettingsUI.PickerItem
            label="Dividing lines"
            secondaryLabel="Between the breathing and each timer"
            iconName="remove"
            iconBackgroundColor="#d8b4fe"
            value={dividerStyle}
            options={dividerStyles.map((option) => ({
              value: option,
              label: dividerStyleLabels[option],
            }))}
            onValueChange={(value) => setDividerStyle(value as DividerStyle)}
            testID="settings.divider-style"
          />
          {dividerStyle !== "none" && (
            <SettingsUI.PickerItem
              label="Line color"
              iconName="color-palette"
              iconBackgroundColor="#d8b4fe"
              value={dividerColor}
              options={dividerColors.map((option) => ({
                value: option,
                label: dividerColorLabels[option],
              }))}
              onValueChange={(value) => setDividerColor(value as DividerColor)}
              testID="settings.divider-color"
            />
          )}
        </SettingsUI.Section>
        <SettingsUI.Section label="Voice and bells">
          <SettingsUI.StepperItem
            label="Volume"
            secondaryLabel="The recorded voice and bells, in percent. Each experience sets its own for counted numbers and beeps"
            iconName="volume-medium"
            iconBackgroundColor="#fdba74"
            value={voiceVolume}
            onIncrease={() => adjustVoiceVolume(volumeStepPercent)}
            onDecrease={() => adjustVoiceVolume(-volumeStepPercent)}
            decreaseDisabled={voiceVolume <= 0}
            increaseDisabled={voiceVolume >= 100}
            testID="settings.voice-volume"
          />
          <SettingsUI.PickerItem
            label="Other audio"
            secondaryLabel="What music does while the voice speaks"
            iconName="musical-notes"
            iconBackgroundColor="#fcd34d"
            value={voiceOtherAudio}
            options={otherAudioOptions}
            onValueChange={(value) => setCueOtherAudio("voice", value as OtherAudioMode)}
            testID="settings.voice-other-audio"
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Soft beeps">
          <SettingsUI.PickerItem
            label="Other audio"
            secondaryLabel="What music does while a beep plays"
            iconName="musical-notes"
            iconBackgroundColor="#fcd34d"
            value={beepOtherAudio}
            options={otherAudioOptions}
            onValueChange={(value) => setCueOtherAudio("beep", value as OtherAudioMode)}
            testID="settings.beep-other-audio"
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Animations">
          <SettingsUI.SwitchItem
            label="Stars"
            secondaryLabel="The drifting stars behind the home page and the session, in the dark theme"
            iconName="sparkles"
            iconBackgroundColor="#a5b4fc"
            value={showStars}
            onValueChange={setShowStars}
            testID="settings.show-stars"
          />
          <SettingsUI.SwitchItem
            label="Breathing circle"
            secondaryLabel="The circles that grow and shrink with each breath"
            iconName="ellipse-outline"
            iconBackgroundColor="#fdba74"
            value={showBreathingAnimation}
            onValueChange={setShowBreathingAnimation}
            testID="settings.show-breathing-animation"
          />
        </SettingsUI.Section>
        <SettingsUI.Section label="Appearance">
          <SettingsUI.SwitchItem
            label="Use system theme"
            secondaryLabel="Follow system light/dark mode"
            iconName="moon"
            iconBackgroundColor="#a5b4fc"
            value={shouldFollowSystemDarkMode}
            onValueChange={(shouldFollow) => {
              // Turning this off must keep the appearance the user is looking at. The
              // stored theme defaults to "light", so a user on a dark phone who switched
              // this off to *keep* dark was flipped to light in front of them.
              if (!shouldFollow) setTheme(resolvedColorScheme);
              setShouldFollowSystemDarkMode(shouldFollow);
            }}
            testID="settings.system-theme"
          />
          {!shouldFollowSystemDarkMode && (
            <SettingsUI.PickerItem
              label="Theme"
              iconName="color-palette"
              iconBackgroundColor="#d8b4fe"
              options={[
                { value: "light", label: "Light theme" },
                { value: "dark", label: "Dark theme" },
              ]}
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
              testID="settings.theme"
            />
          )}
        </SettingsUI.Section>
        <SettingsUI.Section label="Haptics" hideBottomBorderWeb>
          <SettingsUI.SwitchItem
            label="Vibration"
            secondaryLabel="Vibrate on step change"
            iconName="ellipse"
            iconBackgroundColor="aquamarine"
            value={vibrationEnabled}
            onValueChange={setVibrationEnabled}
            testID="settings.vibration"
          />
        </SettingsUI.Section>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  screen: {
    height: "100%",
    width: "100%",
  },
});
