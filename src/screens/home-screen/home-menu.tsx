import Ionicons from "@expo/vector-icons/Ionicons";
import React, { FC } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";

export const faqUrl = "https://github.com/jabsch/breathly-app/blob/master/docs/FAQ.md";

interface Props {
  onNavigate: (route: "Settings" | "About") => unknown;
}

// The menu that slides in from the left: a swipe right on the home page, or the menu button.
export const HomeMenu: FC<Props> = ({ onNavigate }) => {
  const theme = useThemeColors();
  return (
    <View style={styles.container} testID="home.menu-panel">
      <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
        Menu
      </Text>
      <MenuItem
        icon="settings-outline"
        label="Settings"
        testID="menu.settings"
        onPress={() => onNavigate("Settings")}
      />
      <MenuItem
        icon="help-circle-outline"
        label="FAQ"
        testID="menu.faq"
        onPress={() => void Linking.openURL(faqUrl).catch(() => undefined)}
      />
      <MenuItem
        icon="information-circle-outline"
        label="About"
        testID="menu.about"
        onPress={() => onNavigate("About")}
      />
    </View>
  );
};

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID: string;
  onPress: () => unknown;
}

const MenuItem: FC<MenuItemProps> = ({ icon, label, testID, onPress }) => {
  const theme = useThemeColors();
  return (
    <Pressable style={styles.item} onPress={onPress} accessibilityRole="button" testID={testID}>
      <Ionicons name={icon} size={22} color={theme.control} />
      <Text style={[styles.itemLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    ...fontSizes.xxl2,
    fontFamily: fontFamilies.medium,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  item: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  itemLabel: {
    ...fontSizes.lg,
    fontFamily: fontFamilies.regular,
  },
});
