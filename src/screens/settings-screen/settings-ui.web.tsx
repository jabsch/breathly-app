import { MaterialCommunityIcons } from "@expo/vector-icons";
import setColor from "color";
import React, { FC, PropsWithChildren, useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { useColorScheme } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { animate } from "@breathly/utils/animate";
import {
  LinkItemProps,
  PickerItemProps,
  RadioButtonItemProps,
  StepperItemProps,
  SwitchItemProps,
  SectionProps,
  type SettingsUIModule,
} from "./settings-ui.types";

const Section: React.FC<PropsWithChildren<SectionProps>> = ({
  label,
  children,
  hideBottomBorderWeb,
}) => {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <View
      style={[
        styles.section,
        !hideBottomBorderWeb && styles.sectionBorder,
        !hideBottomBorderWeb && isDarkMode && styles.sectionBorderDark,
      ]}
    >
      <View style={styles.sectionBody}>
        <Text style={styles.sectionLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
};

export interface BaseItemProps {
  label?: string;
  secondaryLabel?: string;
  style?: ViewStyle;
  leftItem?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityRole?: TouchableOpacityProps["accessibilityRole"];
  accessibilityState?: TouchableOpacityProps["accessibilityState"];
}

const BaseItem: FC<PropsWithChildren<BaseItemProps>> = ({
  label,
  secondaryLabel,
  onPress,
  style,
  leftItem,
  disabled,
  testID,
  accessibilityRole,
  accessibilityState,
  children,
}) => {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <TouchableOpacity
      style={[styles.item, { paddingLeft: leftItem ? 0 : 72 }, style]}
      onPress={onPress}
      disabled={disabled || !onPress}
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
    >
      {/* The dimming lives on an inner View: TouchableOpacity drives its own
          animated opacity and ignores dynamic `opacity` style changes. */}
      <View style={[styles.itemContent, { opacity: disabled ? 0.5 : 1 }]}>
        {leftItem && <View style={styles.itemLeft}>{leftItem}</View>}
        {label && (
          <View style={styles.itemLabels}>
            <Text style={[styles.itemLabel, isDarkMode && styles.textDark]}>{label}</Text>
            {secondaryLabel && <Text style={styles.itemSecondaryLabel}>{secondaryLabel}</Text>}
          </View>
        )}
        {children}
      </View>
    </TouchableOpacity>
  );
};

const LinkItem: FC<LinkItemProps> = ({ value, onPress, ...baseProps }) => {
  return <BaseItem {...baseProps} secondaryLabel={value} onPress={onPress} />;
};

interface RadioButtonProps {
  selected?: boolean;
  onPress?: () => unknown;
  disabled?: boolean;
  style?: ViewStyle;
}

const RadioButton: FC<RadioButtonProps> = ({
  selected = false,
  onPress = () => null,
  disabled = false,
}) => {
  const animatedValue = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    const animation = animate(animatedValue, {
      toValue: selected ? 1 : 0,
      duration: 200,
    });
    animation.start();
    return () => animation.stop();
  }, [animatedValue, selected]);
  return (
    <TouchableOpacity
      style={[styles.radio, { borderColor: disabled ? colors["stone-200"] : colors["blue-400"] }]}
      onPress={disabled ? undefined : onPress}
    >
      <Animated.View
        style={[
          styles.radioDot,
          {
            backgroundColor: disabled ? colors["stone-200"] : colors["blue-400"],
            transform: [{ scale: animatedValue }],
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const RadioButtonItem: FC<RadioButtonItemProps> = ({
  selected,
  disabled,
  onPress,
  ...baseProps
}) => {
  return (
    <BaseItem
      {...baseProps}
      onPress={onPress}
      disabled={disabled}
      leftItem={<RadioButton selected={selected} disabled={disabled} onPress={onPress} />}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
    />
  );
};

const PickerItem: FC<PickerItemProps> = ({ value, options, onValueChange, ...baseProps }) => {
  // `label` names the field ("Voice"); each option carries its own label. Spreading the
  // base props into the rows overwrote the first with the second, so the field name never
  // reached the screen and the user saw a set of unnamed choices.
  const { label: fieldLabel, ...optionProps } = baseProps;

  return (
    <>
      {fieldLabel ? (
        <Text style={styles.pickerLabel} accessibilityRole="header">
          {fieldLabel}
        </Text>
      ) : null}
      {options.map((option) => (
        <RadioButtonItem
          {...optionProps}
          onPress={() => onValueChange(option.value)}
          key={option.value}
          testID={baseProps.testID ? `${baseProps.testID}.option.${option.value}` : undefined}
          label={option.label}
          selected={option.value === value}
        />
      ))}
    </>
  );
};

const SwitchItem: FC<SwitchItemProps> = ({ value, onValueChange, testID, ...baseProps }) => {
  return (
    <BaseItem {...baseProps}>
      <Switch
        value={value}
        testID={testID}
        accessibilityLabel={baseProps.label}
        style={{ marginRight: -12 }}
        onValueChange={onValueChange}
        thumbColor={value ? colors["blue-400"] : colors["stone-200"]}
        trackColor={{
          true: setColor(colors["blue-400"]).alpha(0.5).rgb().string(),
          false: colors["stone-300"],
        }}
      />
    </BaseItem>
  );
};

const StepperItem: FC<StepperItemProps> = ({
  value,
  increaseDisabled,
  decreaseDisabled,
  onIncrease,
  onDecrease,
  fractionDigits = 0,
  ...baseProps
}) => {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <BaseItem {...baseProps}>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepperButton, { opacity: decreaseDisabled ? 0.4 : 1 }]}
          onPress={onDecrease}
          onLongPressInterval={onDecrease}
          disabled={decreaseDisabled}
          testID={baseProps.testID ? `${baseProps.testID}.decrease` : undefined}
          accessibilityLabel={`Decrease ${baseProps.label ?? "value"}`}
        >
          <MaterialCommunityIcons name="minus" size={16} color="white" />
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
          style={[styles.stepperButton, { opacity: increaseDisabled ? 0.4 : 1 }]}
          onPress={onIncrease}
          onLongPressInterval={onIncrease}
          disabled={increaseDisabled}
          testID={baseProps.testID ? `${baseProps.testID}.increase` : undefined}
          accessibilityLabel={`Increase ${baseProps.label ?? "value"}`}
        >
          <MaterialCommunityIcons name="plus" size={16} color="white" />
        </Pressable>
      </View>
    </BaseItem>
  );
};

// Web keeps the navigation header; the custom header only exists on Android.
const Header: FC<{ title: string; onBack: () => void }> = () => null;

const styles = StyleSheet.create({
  slider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  item: {
    paddingRight: 32,
    paddingVertical: 8,
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemLabel: {
    color: colors["slate-800"],
  },
  itemLabels: {
    flex: 1,
    flexDirection: "column",
    flexShrink: 1,
    justifyContent: "center",
    paddingRight: 16,
  },
  itemLeft: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
  },
  itemSecondaryLabel: {
    ...fontSizes.sm,
    color: colors["slate-500"],
  },
  pickerLabel: {
    ...fontSizes.sm,
    color: colors["slate-600"],
    fontFamily: fontFamilies.medium,
    paddingBottom: 4,
    paddingLeft: 72,
    paddingTop: 8,
  },
  radio: {
    alignItems: "center",
    borderRadius: 9999,
    borderWidth: 2,
    height: 20,
    justifyContent: "center",
    marginVertical: 4,
    width: 20,
  },
  radioDot: {
    borderRadius: 9999,
    height: 10,
    width: 10,
  },
  section: {
    paddingBottom: 8,
  },
  sectionBody: {
    paddingTop: 16,
  },
  sectionBorder: {
    borderBottomColor: colors["slate-300"],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionBorderDark: {
    borderBottomColor: colors["slate-500"],
  },
  sectionLabel: {
    ...fontSizes.xs,
    color: colors["blue-400"],
    paddingBottom: 8,
    paddingLeft: 72,
  },
  stepper: {
    alignItems: "center",
    flexDirection: "row",
  },
  stepperButton: {
    alignItems: "center",
    backgroundColor: colors["blue-400"],
    borderRadius: 6,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperValue: {
    alignSelf: "center",
    paddingHorizontal: 8,
    width: 48,
  },
  stepperValueText: {
    fontFamily: fontFamilies.mono,
    fontWeight: "600",
    textAlign: "center",
  },
  stepperValueWithFractions: {
    width: 56,
  },
  textDark: {
    color: colors.white,
  },
});

const SliderItem: SettingsUIModule["SliderItem"] = ({
  value,
  onValueChange,
  step = 5,
  testID,
  ...baseProps
}) => {
  const isDarkMode = useColorScheme() === "dark";
  return (
    <BaseItem {...baseProps} testID={testID}>
      <View style={styles.slider}>
        {React.createElement("input", {
          type: "range",
          min: 0,
          max: 100,
          step,
          value,
          "aria-label": baseProps.label,
          "data-testid": testID ? `${testID}.slider` : undefined,
          style: { accentColor: colors["blue-500"], width: 96 },
          onChange: (event: { target: { value: string } }) =>
            onValueChange(Number(event.target.value)),
        })}
        <Text
          style={[styles.stepperValueText, isDarkMode && styles.textDark]}
          testID={testID ? `${testID}.value` : undefined}
        >
          {`${value}%`}
        </Text>
      </View>
    </BaseItem>
  );
};

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
