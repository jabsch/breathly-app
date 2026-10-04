import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  type NavigatorScreenParams,
} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import React, { FC } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@breathly/design/colors";
import { useColorScheme } from "@breathly/design/theme";
import { AboutScreen } from "@breathly/screens/about-screen/about-screen";
import {
  ExperienceRootScreen,
  ExperiencePatternPickerScreen,
} from "@breathly/screens/experience-screen/experience-screen";
import { HomeScreen } from "@breathly/screens/home-screen/home-screen";
import { SettingsRootScreen } from "@breathly/screens/settings-screen/settings-screen";
import { useNativeSettingsTheme } from "@breathly/screens/settings-screen/settings-theme";

export type ExperienceStackParamList = {
  ExperienceRoot: undefined;
  ExperiencePatternPicker: undefined;
};

export type SettingsStackParamList = {
  SettingsRoot: undefined;
};

export type RootStackParamList = {
  Home: undefined;
  Experience: NavigatorScreenParams<ExperienceStackParamList>;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
  About: undefined;
};
const RootStack = createNativeStackNavigator<RootStackParamList>();
const ExperienceStack = createNativeStackNavigator<ExperienceStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const AboutStack = createNativeStackNavigator<{ AboutRoot: undefined }>();

export const Navigator: FC = () => {
  const colorScheme = useColorScheme();
  const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const backgroundColor = colorScheme === "dark" ? colors["slate-900"] : colors["stone-100"];
  // On Android the settings stack matches the stock settings app: window and
  // top bar use the Material window tone instead of the app background.
  const nativeSettingsTheme = useNativeSettingsTheme(colorScheme === "dark" ? "dark" : "light");
  const settingsBackgroundColor =
    nativeSettingsTheme?.background ??
    (colorScheme === "dark" ? colors["slate-900"] : colors["stone-100"]);
  const commonHeaderSettings: NativeStackNavigationOptions = {
    // Android draws its own stock-style title bar inside the screen
    // (SettingsUI.Header); the native-stack header stays hidden there.
    headerShown: Platform.OS !== "android",
    headerShadowVisible: Platform.OS === "ios",
    headerStyle: {
      backgroundColor: settingsBackgroundColor,
    },
    contentStyle: {
      backgroundColor: settingsBackgroundColor,
    },
    // Android follows the Material top-app-bar convention: title and
    // navigation icon use the on-surface color, not an accent color.
    headerTintColor:
      Platform.OS === "ios" ? undefined : colorScheme === "dark" ? "#ffffff" : colors["slate-800"],
  };
  const sheetOptions: NativeStackNavigationOptions = {
    presentation: Platform.select({
      ios: "formSheet",
    }),
  };
  const theme = {
    ...baseTheme,
    dark: colorScheme === "dark",
    colors: {
      ...baseTheme.colors,
      background: backgroundColor,
    },
  };
  return (
    <SafeAreaProvider style={{ backgroundColor }}>
      <NavigationContainer theme={theme}>
        <RootStack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <RootStack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              animation: Platform.OS === "ios" ? "fade" : "simple_push",
            }}
          />
          <RootStack.Screen name="Experience" options={sheetOptions}>
            {() => (
              <ExperienceStack.Navigator initialRouteName="ExperienceRoot">
                <ExperienceStack.Screen
                  name="ExperienceRoot"
                  component={ExperienceRootScreen}
                  options={{
                    ...commonHeaderSettings,
                    headerTitle: "Create Experience",
                  }}
                />
                <ExperienceStack.Screen
                  name="ExperiencePatternPicker"
                  component={ExperiencePatternPickerScreen}
                  options={{
                    headerTitle: "Breathing Patterns",
                    ...commonHeaderSettings,
                  }}
                />
              </ExperienceStack.Navigator>
            )}
          </RootStack.Screen>
          <RootStack.Screen name="Settings" options={sheetOptions}>
            {() => (
              <SettingsStack.Navigator initialRouteName="SettingsRoot">
                <SettingsStack.Screen
                  name="SettingsRoot"
                  component={SettingsRootScreen}
                  options={{
                    ...commonHeaderSettings,
                    // iOS 26 hides the large title when the header has an explicit
                    // background color. React Navigation avoids this by making the
                    // header transparent, but only when the color is unset. The screen
                    // below the header already paints the same color, so the header
                    // looks the same and the title becomes visible again.
                    headerStyle:
                      Platform.OS === "ios" ? undefined : commonHeaderSettings.headerStyle,
                    headerLargeTitleEnabled: true,
                    headerTitle: "Settings",
                    headerLargeTitleShadowVisible: true,
                  }}
                />
              </SettingsStack.Navigator>
            )}
          </RootStack.Screen>
          <RootStack.Screen name="About" options={sheetOptions}>
            {() => (
              <AboutStack.Navigator>
                <AboutStack.Screen
                  name="AboutRoot"
                  component={AboutScreen}
                  options={{ ...commonHeaderSettings, headerTitle: "About" }}
                />
              </AboutStack.Navigator>
            )}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
