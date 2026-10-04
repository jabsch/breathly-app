import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { FC } from "react";
import { Animated, ScrollView, Button, Platform, StyleSheet } from "react-native";
import { SettingsStackParamList } from "@breathly/core/navigator";
import { useColorScheme } from "@breathly/design/theme";
import { SettingsUI } from "@breathly/screens/settings-screen/settings-ui";
import { useSettingsStore } from "@breathly/stores/settings";
import {
  volumeStepPercent,
  type OtherAudioMode,
  type Theme,
} from "@breathly/stores/settings-state";

const otherAudioOptions: { value: OtherAudioMode; label: string }[] = [
  { value: "keep", label: "Keep playing" },
  { value: "lower", label: "Lower" },
  { value: "pause", label: "Pause" },
];

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
  const beepVolume = useSettingsStore((state) => state.beepVolume);
  const voiceOtherAudio = useSettingsStore((state) => state.voiceOtherAudio);
  const beepOtherAudio = useSettingsStore((state) => state.beepOtherAudio);
  const adjustCueVolume = useSettingsStore((state) => state.adjustCueVolume);
  const setCueOtherAudio = useSettingsStore((state) => state.setCueOtherAudio);

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
        <SettingsUI.Section label="Voice and bells">
          <SettingsUI.StepperItem
            label="Volume"
            secondaryLabel="Voice cues, counted numbers and bells, in percent"
            iconName="volume-medium"
            iconBackgroundColor="#fdba74"
            value={voiceVolume}
            onIncrease={() => adjustCueVolume("voice", volumeStepPercent)}
            onDecrease={() => adjustCueVolume("voice", -volumeStepPercent)}
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
          <SettingsUI.StepperItem
            label="Volume"
            secondaryLabel="The beep every second, in percent"
            iconName="radio-button-on"
            iconBackgroundColor="#86efac"
            value={beepVolume}
            onIncrease={() => adjustCueVolume("beep", volumeStepPercent)}
            onDecrease={() => adjustCueVolume("beep", -volumeStepPercent)}
            decreaseDisabled={beepVolume <= 0}
            increaseDisabled={beepVolume >= 100}
            testID="settings.beep-volume"
          />
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
