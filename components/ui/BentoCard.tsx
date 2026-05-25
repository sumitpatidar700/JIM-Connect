import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/src/theme/tokens';

type Props = {
  accentColor: string;
  description: string;
  icon: ReactNode;
  title: string;
};

export function BentoCard({ accentColor, description, icon, title }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: accentColor }]}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    minHeight: 142,
    padding: spacing.lg,
    ...shadows.card,
  },
  description: {
    color: colors.text,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.78,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
});
