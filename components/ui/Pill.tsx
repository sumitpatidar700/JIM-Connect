import { StyleSheet, Text, View } from 'react-native';

import { radii, spacing, typography } from '@/src/theme/tokens';
import { useThemeColors } from '@/src/utils/settings-effects';

type Props = {
  label: string;
  tone?: 'brand' | 'default' | 'success' | 'dark' | 'danger' | 'warning';
  style?: any;
};

export function Pill({ label, tone = 'default', style }: Props) {
  const themeColors = useThemeColors();
  const tones = {
    brand: { backgroundColor: themeColors.primarySoft },
    dark: { backgroundColor: themeColors.text },
    default: { backgroundColor: themeColors.surfaceAlt },
    success: { backgroundColor: themeColors.accentGreenSoft },
    danger: { backgroundColor: '#EF4444' },
    warning: { backgroundColor: '#F59E0B' },
  };
  const toneLabels = {
    brand: { color: themeColors.primary },
    dark: { color: themeColors.background },
    default: { color: themeColors.text },
    success: { color: themeColors.accentGreenDeep },
    danger: { color: '#FFFFFF' },
    warning: { color: '#FFFFFF' },
  };

  return (
    <View style={[styles.base, tones[tone], style]}>
      <Text style={[styles.label, toneLabels[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radii.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  label: {
    fontFamily: typography.medium,
    fontSize: 12,
  },
});
