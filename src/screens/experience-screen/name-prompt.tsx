import React, { FC, useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import { useThemeColors } from "@breathly/design/theme";
import { fontFamilies, fontSizes } from "@breathly/design/typography";
import { maximumExperienceNameLength } from "@breathly/stores/settings-state";

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  initialName: string;
  // A timer needs a name to be told apart from the others; a breathing experience falls back
  // to its pattern's name.
  requireName: boolean;
  onSubmit: (name: string) => unknown;
  onCancel: () => unknown;
}

export const NamePrompt: FC<Props> = ({
  visible,
  title,
  message,
  initialName,
  requireName,
  onSubmit,
  onCancel,
}) => {
  const theme = useThemeColors();
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) setName(initialName);
  }, [initialName, visible]);

  const trimmedName = name.trim();
  const canSubmit = !requireName || trimmedName !== "";
  const submit = () => {
    if (canSubmit) onSubmit(trimmedName);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View
          style={[styles.dialog, { backgroundColor: theme.surface }]}
          testID="experience.name-prompt"
        >
          <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
            {title}
          </Text>
          {message !== undefined && (
            <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
          )}
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            autoFocus
            maxLength={maximumExperienceNameLength}
            placeholder={requireName ? "Sauna, tea, laundry…" : "Optional"}
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            accessibilityLabel="Name"
            testID="experience.name-input"
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              style={styles.action}
              testID="experience.name-cancel"
            >
              <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              style={[styles.action, styles.primaryAction, !canSubmit && styles.disabled]}
              testID="experience.name-ok"
            >
              <Text style={[styles.actionLabel, styles.primaryActionLabel]}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  action: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionLabel: {
    ...fontSizes.base,
    fontFamily: fontFamilies.medium,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 16,
  },
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  dialog: {
    borderRadius: 16,
    maxWidth: 360,
    padding: 20,
    width: "100%",
  },
  disabled: {
    opacity: 0.4,
  },
  input: {
    ...fontSizes.lg,
    borderRadius: 8,
    borderWidth: 1,
    fontFamily: fontFamilies.regular,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  message: {
    ...fontSizes.base,
    fontFamily: fontFamilies.regular,
    marginTop: 4,
  },
  primaryAction: {
    backgroundColor: colors.pastel["orange-light"],
  },
  primaryActionLabel: {
    color: colors["slate-800"],
  },
  title: {
    ...fontSizes.xl,
    fontFamily: fontFamilies.medium,
  },
});
