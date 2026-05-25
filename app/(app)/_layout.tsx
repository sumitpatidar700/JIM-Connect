import { Redirect, Stack } from "expo-router";

import { useAuthStore } from "@/src/store/auth-store";

export default function AppLayout() {
  const { session } = useAuthStore();

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="events/[id]/register" />
    </Stack>
  );
}
