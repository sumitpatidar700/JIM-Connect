import {
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    useFonts,
} from "@expo-google-fonts/manrope";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SplashScreenView } from "@/components/ui/SplashScreenView";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthBootstrap } from "@/src/hooks/useAuthBootstrap";
import { queryClient } from "@/src/lib/query-client";
import { AppFeedbackProvider } from "@/src/providers/app-feedback-provider";
import { useAuthStore } from "@/src/store/auth-store";
import { useAppSettingsStore } from "@/src/store/settings-store";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const effectiveColorScheme = themeMode === "system" ? colorScheme : themeMode;
  useAuthBootstrap();

  useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const [minSplashTimer, setMinSplashTimer] = useState(false);

  useEffect(() => {
    // Hide native splash screen immediately to reveal our seamless JS splash view
    SplashScreen.hideAsync().catch(() => undefined);

    const timer = setTimeout(() => {
      setMinSplashTimer(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppFeedbackProvider>
        <SafeAreaProvider>
          {!minSplashTimer ? (
            <SplashScreenView />
          ) : (
            <ThemeProvider
              value={effectiveColorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(app)" />
              </Stack>
              <StatusBar
                style={effectiveColorScheme === "dark" ? "light" : "dark"}
              />
            </ThemeProvider>
          )}
        </SafeAreaProvider>
      </AppFeedbackProvider>
    </QueryClientProvider>
  );
}
