import { IconSymbol } from "@/components/ui/icon-symbol";
import { Href, router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { radii, spacing, typography } from "@/src/theme/tokens";
import { useThemeColors } from "@/src/utils/settings-effects";

type Props = {
  fallbackHref?: Href;
  iconOnly?: boolean;
  label?: string;
  plain?: boolean;
};

export function BackButton({
  fallbackHref,
  iconOnly = false,
  label = "Back",
  plain = false,
}: Props) {
  const themeColors = useThemeColors();
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    if (fallbackHref) {
      router.replace(fallbackHref);
    }
  };

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        plain
          ? styles.plainButton
          : {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
        iconOnly && styles.iconOnly,
        plain && iconOnly && styles.plainIconOnly,
        pressed && styles.pressed,
      ]}
    >
      <IconSymbol color={themeColors.text} name="chevron-back" size={20} />
      {iconOnly ? null : (
        <Text style={[styles.label, { color: themeColors.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.round,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  iconOnly: {
    justifyContent: "center",
    marginBottom: 0,
    minWidth: 40,
    paddingHorizontal: 0,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  plainButton: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  plainIconOnly: {
    minWidth: 28,
  },
});
