import { Tabs } from "expo-router";

import { BottomNav } from "@/components/ui/BottomNav";
import { useAuthStore } from "@/src/store/auth-store";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function TabLayout() {
  const role = useAuthStore((state) => state.profile?.role);
  const isAdmin = role === "admin";
  const themeColors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: themeColors.background },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.muted,
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <BottomNav {...props} isAdmin={isAdmin} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: isAdmin ? null : undefined,
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          href: isAdmin ? null : undefined,
          title: "Events",
        }}
      />
      <Tabs.Screen
        name="winners"
        options={{
          href: isAdmin ? null : undefined,
          title: "Winners",
        }}
      />
      <Tabs.Screen
        name="repository"
        options={{
          href: isAdmin ? null : undefined,
          title: "Archive",
        }}
      />
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          href: isAdmin ? undefined : null,
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="admin-announcements"
        options={{
          href: isAdmin ? undefined : null,
          title: "Notices",
        }}
      />
      <Tabs.Screen
        name="admin-events"
        options={{
          href: isAdmin ? undefined : null,
          title: "Manage",
        }}
      />
      <Tabs.Screen
        name="admin-results"
        options={{
          href: isAdmin ? undefined : null,
          title: "Results",
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: "Gallery",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Account",
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: null,
          title: "Admin",
        }}
      />
    </Tabs>
  );
}
