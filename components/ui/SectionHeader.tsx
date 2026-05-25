import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/src/theme/tokens';
import { useThemeColors } from '@/src/utils/settings-effects';

type Props = {
  actionLabel?: string;
  onActionPress?: () => void;
  subtitle?: string;
  title: string;
};

export function SectionHeader({ actionLabel, onActionPress, subtitle, title }: Props) {
  const themeColors = useThemeColors();

  return (
    <View style={styles.wrapper}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress}>
          <Text style={[styles.action, { color: themeColors.primary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  text: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
    marginBottom: 2,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  action: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
});
