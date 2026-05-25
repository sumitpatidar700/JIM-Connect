import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/src/theme/tokens';
import { useThemeColors } from '@/src/utils/settings-effects';

type Props = {
  fullScreen?: boolean;
  message?: string;
};

export function LoadingState({ fullScreen = false, message = 'Loading...' }: Props) {
  const themeColors = useThemeColors();

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        fullScreen && { backgroundColor: themeColors.background },
      ]}
    >
      <ActivityIndicator color={themeColors.primary} size="large" />
      <Text style={[styles.message, { color: themeColors.muted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
});
