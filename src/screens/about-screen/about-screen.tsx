import React, { FC } from "react";
import { Animated, Linking, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { faqUrl } from "@breathly/screens/home-screen/home-menu";
import { SettingsUI } from "@breathly/screens/settings-screen/settings-ui";

const repositoryUrl = "https://github.com/jabsch/breathly-app";
const upstreamUrl = "https://github.com/mmazzarolo/breathly-app";
const licenseUrl = "https://www.mozilla.org/en-US/MPL/2.0/";

const open = (url: string) => () => void Linking.openURL(url).catch(() => undefined);

export const AboutScreen: FC<{ navigation: { goBack: () => void } }> = ({ navigation }) => {
  const theme = useThemeColors();
  return (
    <Animated.View style={styles.screen}>
      <SettingsUI.Header title="About" onBack={navigation.goBack} />
      <ScrollView
        testID="about.screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: theme.text }]}>Breathly</Text>
        <Text style={[styles.body, { color: theme.text }]}>
          Breathing exercises and timers that keep going with the screen off. This is a fork of
          Breathly by Matteo Mazzarolo, released under the Mozilla Public License 2.0.
        </Text>
        <SettingsUI.Section label="Links" hideBottomBorderWeb>
          <SettingsUI.LinkItem
            label="FAQ"
            value=""
            iconName="help-circle"
            iconBackgroundColor="#bfdbfe"
            onPress={open(faqUrl)}
            testID="about.faq"
          />
          <SettingsUI.LinkItem
            label="Source code"
            value=""
            iconName="code-slash"
            iconBackgroundColor="#d8b4fe"
            onPress={open(repositoryUrl)}
            testID="about.source"
          />
          <SettingsUI.LinkItem
            label="Original Breathly"
            value=""
            iconName="leaf"
            iconBackgroundColor="#86efac"
            onPress={open(upstreamUrl)}
            testID="about.upstream"
          />
          <SettingsUI.LinkItem
            label="License (MPL 2.0)"
            value=""
            iconName="document-text"
            iconBackgroundColor="#fdba74"
            onPress={open(licenseUrl)}
            testID="about.license"
          />
        </SettingsUI.Section>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  body: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
    marginBottom: 12,
    paddingHorizontal: Platform.OS === "android" ? 16 : 0,
  },
  content: {
    paddingBottom: 24,
    paddingHorizontal: Platform.OS === "android" ? undefined : 18,
  },
  screen: {
    height: "100%",
    width: "100%",
  },
  title: {
    ...fontSizes.xxl2,
    fontFamily: fontFamilies.serifSemibold,
    marginBottom: 4,
    marginTop: 16,
    paddingHorizontal: Platform.OS === "android" ? 16 : 0,
  },
});
