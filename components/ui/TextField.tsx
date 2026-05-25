import {
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from "react-native";

import { radii, spacing, typography } from "@/src/theme/tokens";
import { getResponsiveFontSize } from "@/src/utils/responsive";
import { useAppSettingsStore } from "@/src/store/settings-store";
import { applyFontScale, compactValue, useThemeColors } from "@/src/utils/settings-effects";

type Props = TextInputProps & {
  label: string;
  rightIcon?: React.ReactNode;
  rightIconAccessibilityLabel?: string;
  onRightIconPress?: () => void;
};

export function TextField({
  label,
  multiline,
  rightIcon,
  rightIconAccessibilityLabel,
  onRightIconPress,
  ...props
}: Props) {
  const compactLayout = useAppSettingsStore((state) => state.compactLayout);
  const fontScale = useAppSettingsStore((state) => state.fontScale);
  const themeColors = useThemeColors();

  return (
    <View style={styles.wrapper}>
      {Boolean(label) ? (
        <Text
          style={[
            styles.label,
            {
              color: themeColors.text,
              fontSize: applyFontScale(getResponsiveFontSize(14, 13, 15), fontScale),
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      <View style={styles.inputWrapper}>
        <TextInput
          multiline={multiline}
          placeholderTextColor={themeColors.muted}
          style={[
            styles.input,
            {
              fontSize: applyFontScale(getResponsiveFontSize(15, 14, 16), fontScale),
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              color: themeColors.text,
              minHeight: compactValue(52, compactLayout, 0.86),
              paddingHorizontal: compactValue(spacing.md, compactLayout, 0.86),
            },
            multiline && styles.textArea,
            !!rightIcon && styles.inputWithIcon,
          ]}
          {...props}
        />
        {rightIcon && (
          <Pressable
            accessibilityLabel={rightIconAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.iconButton}
            onPress={onRightIconPress}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(14, 13, 15),
  },
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderRadius: radii.lg,
    borderWidth: 1,
    fontFamily: typography.regular,
    fontSize: getResponsiveFontSize(15, 14, 16),
    minHeight: 52,
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
  iconButton: {
    position: "absolute",
    right: spacing.md,
    minHeight: 44,
    minWidth: 44,
    padding: spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
