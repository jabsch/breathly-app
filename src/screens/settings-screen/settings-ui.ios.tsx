import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import React, { FC, PropsWithChildren, useState } from "react";
import { LayoutAnimation, StyleSheet, Switch, Text, View, ViewStyle } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { useColorScheme, useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import {
  LinkItemProps,
  PickerItemProps,
  RadioButtonItemProps,
  StepperItemProps,
  SwitchItemProps,
  SectionProps,
  type SettingsUIModule,
} from "./settings-ui.types";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const Section: React.FC<PropsWithChildren<SectionProps>> = ({ label, children }) => {
  const isDarkMode = useColorScheme() === "dark";
  const theme = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
        {React.Children.map(children, (child, index) =>
          index === 0 || !child ? (
            child
          ) : (
            <>
              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              {child}
            </>
          ),
        )}
      </View>
    </View>
  );
};

export interface BaseItemProps {
  label?: string;
  secondaryLabel?: string;
  // Widened to string to match the shared interface; cast where rendered.
  iconName?: string;
  iconBackgroundColor?: string;
  style?: ViewStyle;
  testID?: string;
}

const BaseItem: FC<PropsWithChildren<BaseItemProps>> = ({
  label,
  iconName,
  iconBackgroundColor,
  secondaryLabel,
  children,
}) => {
  const isDarkMode = useColorScheme() === "dark";
  const theme = useThemeColors();
  return (
    <View style={styles.item}>
      {(iconName || label) && (
        <View style={styles.row}>
          {iconName && (
            <View style={[styles.icon, { backgroundColor: iconBackgroundColor }]}>
              <Ionicons
                style={{ padding: 4 }}
                name={iconName as IoniconName}
                size={18}
                color="white"
              />
            </View>
          )}
          <View style={styles.column}>
            <Text style={isDarkMode && styles.textDark}>{label}</Text>
            {secondaryLabel && (
              <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
                {secondaryLabel}
              </Text>
            )}
          </View>
        </View>
      )}
      {children}
    </View>
  );
};

export const LinkItem: FC<LinkItemProps> = ({ value, onPress, ...baseProps }) => {
  const theme = useThemeColors();
  return (
    <Pressable onPress={onPress} testID={baseProps.testID} accessibilityRole="button">
      <BaseItem {...baseProps}>
        <View style={styles.row}>
          <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>{value}</Text>
          <Ionicons
            style={{ padding: 4 }}
            name={"chevron-forward"}
            size={18}
            color={theme.textSecondary}
          />
        </View>
      </BaseItem>
    </Pressable>
  );
};

export const PickerItem: FC<PickerItemProps> = ({
  value,
  options,
  onValueChange,
  ...baseProps
}) => {
  const colorScheme = useColorScheme();
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    LayoutAnimation.easeInEaseOut();
    setExpanded((prevExpanded) => !prevExpanded);
  };
  return (
    <>
      <Pressable onPress={toggleExpanded} testID={baseProps.testID} accessibilityRole="button">
        <BaseItem {...baseProps}>
          <Text style={styles.accentText}>
            {options.find((option) => option.value === value)?.label ?? value}
          </Text>
        </BaseItem>
      </Pressable>
      {expanded && (
        <Picker
          selectedValue={value}
          onValueChange={onValueChange}
          testID={baseProps.testID ? `${baseProps.testID}.picker` : undefined}
        >
          {options.map(({ label, value }) => (
            <Picker.Item
              key={value}
              label={label}
              value={value}
              color={colorScheme === "dark" ? "white" : undefined}
            />
          ))}
        </Picker>
      )}
    </>
  );
};

export const SwitchItem: FC<SwitchItemProps> = ({ value, onValueChange, ...baseProps }) => {
  return (
    <BaseItem {...baseProps}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        testID={baseProps.testID}
        accessibilityLabel={baseProps.label}
      />
    </BaseItem>
  );
};

export const StepperItem: FC<StepperItemProps> = ({
  value,
  increaseDisabled,
  decreaseDisabled,
  onIncrease,
  onDecrease,
  fractionDigits = 0,
  ...baseProps
}) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";
  return (
    <BaseItem {...baseProps}>
      <View style={[styles.stepper, isDarkMode && styles.stepperDark]}>
        <Pressable
          style={[
            styles.stepperButton,
            styles.stepperButtonLeft,
            isDarkMode && styles.stepperButtonDark,
          ]}
          onPress={onDecrease}
          onLongPressInterval={onDecrease}
          disabled={decreaseDisabled}
          testID={baseProps.testID ? `${baseProps.testID}.decrease` : undefined}
          accessibilityLabel={`Decrease ${baseProps.label ?? "value"}`}
        >
          <Ionicons
            name={"remove"}
            size={18}
            style={{ opacity: decreaseDisabled ? 0.2 : 1 }}
            color={isDarkMode ? "white" : colors["slate-500"]}
          />
        </Pressable>
        <View style={[styles.stepperValue, fractionDigits > 0 && styles.stepperValueWithFractions]}>
          <Text
            style={[styles.stepperValueText, isDarkMode && styles.textDark]}
            numberOfLines={1}
            testID={baseProps.testID ? `${baseProps.testID}.value` : undefined}
          >
            {typeof value === "number" && fractionDigits > 0
              ? value.toFixed(fractionDigits)
              : value}
          </Text>
        </View>
        <Pressable
          style={[
            styles.stepperButton,
            styles.stepperButtonRight,
            isDarkMode && styles.stepperButtonDark,
          ]}
          onPress={onIncrease}
          onLongPressInterval={onIncrease}
          disabled={increaseDisabled}
          testID={baseProps.testID ? `${baseProps.testID}.increase` : undefined}
          accessibilityLabel={`Increase ${baseProps.label ?? "value"}`}
        >
          <Ionicons
            name={"add"}
            size={18}
            style={{ opacity: increaseDisabled ? 0.2 : 1 }}
            color={isDarkMode ? "white" : colors["slate-500"]}
          />
        </Pressable>
      </View>
    </BaseItem>
  );
};

export const RadioButtonItem: FC<RadioButtonItemProps> = ({
  label,
  secondaryLabel,
  selected,
  onPress,
  disabled,
  ...baseProps
}) => {
  const isDarkMode = useColorScheme() === "dark";
  const theme = useThemeColors();
  return (
    <BaseItem {...baseProps}>
      <Pressable
        onPress={onPress}
        style={styles.radioPressable}
        disabled={disabled}
        testID={baseProps.testID}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, disabled }}
      >
        {/* The dimming lives on an inner View: TouchableOpacity drives its own
            animated opacity and ignores dynamic `opacity` style changes. */}
        <View style={[styles.radioContent, { opacity: disabled ? 0.5 : 1 }]}>
          <View style={styles.radioLabels}>
            <Text style={isDarkMode && styles.textDark}>{label}</Text>
            <Text style={[styles.secondaryText, { color: theme.textSecondary }]}>
              {secondaryLabel}
            </Text>
          </View>
          <View style={styles.radioCheck}>
            {selected && <Ionicons name={"checkmark-sharp"} size={18} color={colors["blue-500"]} />}
          </View>
        </View>
      </Pressable>
    </BaseItem>
  );
};

// iOS keeps the native-stack header; the custom header only exists on Android.
const Header: FC<{ title: string; onBack: () => void }> = () => null;

const styles = StyleSheet.create({
  accentText: {
    color: colors["blue-500"],
  },
  column: {
    flexDirection: "column",
  },
  divider: {
    backgroundColor: colors["stone-200"],
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  dividerDark: {
    backgroundColor: colors["slate-500"],
  },
  icon: {
    borderRadius: 6,
    marginRight: 8,
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  radioCheck: {
    alignItems: "flex-end",
    flexGrow: 1,
    width: 24,
  },
  radioContent: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  radioLabels: {
    flexShrink: 1,
  },
  radioPressable: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    paddingVertical: 8,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
  },
  secondaryText: {},
  section: {
    paddingTop: 16,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  sectionCardDark: {
    backgroundColor: colors["slate-800"],
  },
  sectionLabel: {
    ...fontSizes.xs,
    marginBottom: 8,
    paddingHorizontal: 16,
    textTransform: "uppercase",
  },
  stepper: {
    borderColor: colors["stone-200"],
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: colors["gray-100"],
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stepperButtonDark: {
    backgroundColor: colors["slate-700"],
  },
  stepperButtonLeft: {
    borderBottomLeftRadius: 6,
    borderTopLeftRadius: 6,
  },
  stepperButtonRight: {
    borderBottomRightRadius: 6,
    borderTopRightRadius: 6,
  },
  stepperDark: {
    borderColor: colors["slate-600"],
  },
  stepperValue: {
    alignSelf: "center",
    paddingHorizontal: 8,
    width: 48,
  },
  stepperValueText: {
    fontFamily: fontFamilies.mono,
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  stepperValueWithFractions: {
    width: 56,
  },
  textDark: {
    color: colors.white,
  },
});

// iOS is not built from this fork; a stepper in the same steps stands in for a slider.
const SliderItem: SettingsUIModule["SliderItem"] = ({
  value,
  onValueChange,
  step = 5,
  ...rest
}) => (
  <StepperItem
    {...rest}
    value={`${value}%`}
    onDecrease={() => onValueChange(Math.max(0, value - step))}
    onIncrease={() => onValueChange(Math.min(100, value + step))}
    decreaseDisabled={value <= 0}
    increaseDisabled={value >= 100}
  />
);

export const SettingsUI: SettingsUIModule = {
  Section,
  Header,
  LinkItem,
  PickerItem,
  SwitchItem,
  StepperItem,
  SliderItem,
  RadioButtonItem,
};
