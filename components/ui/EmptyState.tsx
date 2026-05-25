import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/src/theme/tokens';
import { useAppSettingsStore } from '@/src/store/settings-store';
import { applyFontScale, compactValue, useThemeColors } from '@/src/utils/settings-effects';

type Props = {
  message: string;
  title: string;
};

export function EmptyState({ message, title }: Props) {
  const compactLayout = useAppSettingsStore((state) => state.compactLayout);
  const fontScale = useAppSettingsStore((state) => state.fontScale);
  const themeColors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.surfaceAlt,
          padding: compactValue(spacing.lg, compactLayout),
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: themeColors.text, fontSize: applyFontScale(18, fontScale) },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          { color: themeColors.muted, fontSize: applyFontScale(14, fontScale) },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  message: {
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    fontFamily: typography.semiBold,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
});
