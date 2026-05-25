import React, { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { radii, spacing, typography } from "@/src/theme/tokens";
import { getResponsiveFontSize } from "@/src/utils/responsive";
import { useAppSettingsStore } from "@/src/store/settings-store";
import { applyFontScale, compactValue, useThemeColors } from "@/src/utils/settings-effects";
import { IconSymbol } from "./icon-symbol";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  icon?: ComponentProps<typeof IconSymbol>["name"];
  label?: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function PrimaryButton({
  disabled = false,
  loading = false,
  icon,
  label,
  onPress,
  style,
  variant = "primary",
}: Props) {
  const compactLayout = useAppSettingsStore((state) => state.compactLayout);
  const fontScale = useAppSettingsStore((state) => state.fontScale);
  const themeColors = useThemeColors();
  const variantStyle = {
    ghost: {
      backgroundColor: "transparent",
      borderColor: themeColors.border,
      borderWidth: 1,
    },
    primary: {
      backgroundColor: themeColors.primary,
    },
    secondary: {
      backgroundColor: themeColors.surfaceAlt,
      borderColor: themeColors.border,
      borderWidth: 1,
    },
    danger: {
      backgroundColor: "#EF4444",
      borderColor: "#DC2626",
      borderWidth: 1,
    },
  }[variant];
  const labelColor = {
    ghost: themeColors.primary,
    primary: themeColors.white,
    secondary: themeColors.text,
    danger: themeColors.white,
  }[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        style,
        variantStyle,
        {
          minHeight: compactValue(52, compactLayout, 0.86),
          paddingHorizontal: compactValue(spacing.md, compactLayout, 0.86),
        },
        !label && icon && styles.iconOnly,
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={labelColor} size="small" style={{ marginRight: 4 }} />
        ) : icon ? (
          <IconSymbol
            color={labelColor}
            name={icon}
            size={20}
            style={label && styles.iconWithLabel}
          />
        ) : null}
        {label && (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: labelColor },
              { fontSize: applyFontScale(getResponsiveFontSize(15, 14, 16), fontScale) },
            ]}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  iconOnly: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(15, 14, 16),
  },
  iconWithLabel: {
    marginRight: 2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
