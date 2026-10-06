import type React from "react";
import type { PropsWithChildren } from "react";

export interface SectionProps {
  label: string;
  // Web only. iOS and Android ignore it — they draw their own section separators. The name
  // carries the platform because a TypeScript contract cannot make the other two obey it.
  hideBottomBorderWeb?: boolean;
}

interface CommonItemProps {
  label?: string;
  secondaryLabel?: string;
  testID?: string;
  // Rendered by the iOS implementation only.
  iconName?: string;
  iconBackgroundColor?: string;
}

export interface LinkItemProps extends CommonItemProps {
  value: string;
  onPress: () => unknown;
}

export interface PickerItemProps extends CommonItemProps {
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => unknown;
}

export interface SwitchItemProps extends CommonItemProps {
  value: boolean;
  onValueChange?: (newValue: boolean) => void;
}

export interface StepperItemProps extends CommonItemProps {
  value?: number | string;
  increaseDisabled?: boolean;
  decreaseDisabled?: boolean;
  onIncrease?: () => unknown;
  onDecrease?: () => unknown;
  fractionDigits?: number;
}

// A percentage, dragged in steps of `step`.
export interface SliderItemProps extends CommonItemProps {
  value: number;
  onValueChange: (value: number) => unknown;
  step?: number;
}

export interface HeaderProps {
  title: string;
  onBack: () => void;
}

export interface RadioButtonItemProps extends CommonItemProps {
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

// The contract each platform implementation has to satisfy. Annotating the exported
// `SettingsUI` object with this in every implementation is what makes the compiler compare
// them; the declaration alone never did, which is how three of them drifted apart.
export interface SettingsUIModule {
  Section: React.FC<PropsWithChildren<SectionProps>>;
  Header: React.FC<HeaderProps>;
  LinkItem: React.FC<LinkItemProps>;
  PickerItem: React.FC<PickerItemProps>;
  SwitchItem: React.FC<SwitchItemProps>;
  StepperItem: React.FC<StepperItemProps>;
  SliderItem: React.FC<SliderItemProps>;
  RadioButtonItem: React.FC<RadioButtonItemProps>;
}
