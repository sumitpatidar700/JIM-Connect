import { Stack } from 'expo-router';

import { colors } from '@/src/theme/tokens';
import { ThemeOverrideContext } from '@/src/utils/settings-effects';

export default function AuthLayout() {
  return (
    <ThemeOverrideContext.Provider value="light">
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShown: false,
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </ThemeOverrideContext.Provider>
  );
}
