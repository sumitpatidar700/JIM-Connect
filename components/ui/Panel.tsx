import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { radii, shadows, spacing } from '@/src/theme/tokens';
import { useAppSettingsStore } from '@/src/store/settings-store';
import { compactValue, useThemeColors } from '@/src/utils/settings-effects';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}> &
  ViewProps;

export function Panel({ children, style, ...rest }: Props) {
  const compactLayout = useAppSettingsStore((state) => state.compactLayout);
  const themeColors = useThemeColors();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          padding: compactValue(spacing.lg, compactLayout),
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    ...shadows.card,
  },
});
