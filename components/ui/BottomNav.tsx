import { useThemeColors } from "@/src/utils/settings-effects";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useEffect } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  Text,
} from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth-store";
import { useBadgeStore } from "@/src/store/badge-store";
import { announcementService } from "@/src/services/announcement-service";
import { eventService } from "@/src/services/event-service";
import { winnerService } from "@/src/services/winner-service";

const { width } = Dimensions.get("window");

interface BottomNavProps {
  state: any;
  descriptors: any;
  navigation: any;
  isAdmin: boolean;
}

const REGULAR_TABS = [
  { id: "index", icon: "home", label: "Home" },
  { id: "events", icon: "event", label: "Events" },
  { id: "winners", icon: "emoji-events", label: "Winners" },
  { id: "gallery", icon: "photo-library", label: "Gallery" },
  { id: "profile", icon: "account-circle", label: "Account" },
];

const ADMIN_TABS = [
  { id: "admin-dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "admin-announcements", icon: "campaign", label: "Notices" },
  { id: "admin-events", icon: "edit-calendar", label: "Manage" },
  { id: "admin-results", icon: "emoji-events", label: "Results" },
  { id: "gallery", icon: "photo-library", label: "Gallery" },
  { id: "profile", icon: "account-circle", label: "Account" },
];

export const BottomNav: React.FC<BottomNavProps> = ({ state, navigation, isAdmin }) => {
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const tabs = isAdmin ? ADMIN_TABS : REGULAR_TABS;
  const profile = useAuthStore((state) => state.profile);
  const { initSessionViewed, markTabAsViewed, isItemUnreadForNavbar } = useBadgeStore();

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => eventService.searchEvents(""),
    refetchInterval: 30000,
  });

  const { data: announcements } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => announcementService.listAnnouncements(),
    refetchInterval: 30000,
  });

  const { data: winners } = useQuery({
    queryKey: ["winners"],
    queryFn: () => winnerService.listWinners(),
    refetchInterval: 30000,
  });

  const { data: pendingInvites } = useQuery({
    queryKey: ["pendingInvites", profile?.id],
    queryFn: () => eventService.listPendingInvites(profile?.id ?? ""),
    enabled: Boolean(profile?.id && !isAdmin),
    refetchInterval: 30000,
  });

  const activeTabIndex = useMemo(() => {
    const currentRouteName = state.routes[state.index].name;
    const index = tabs.findIndex(t => t.id === currentRouteName);
    return index >= 0 ? index : 0;
  }, [state.index, state.routes, tabs]);

  useEffect(() => {
    const currentTabId = tabs[activeTabIndex]?.id;
    if (currentTabId) {
      initSessionViewed(currentTabId);
      markTabAsViewed(currentTabId);
    }
  }, [activeTabIndex, tabs, initSessionViewed, markTabAsViewed]);

  const navigateTo = useCallback(
    (tabId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      markTabAsViewed(tabId);
      navigation.navigate(tabId);
    },
    [navigation, markTabAsViewed],
  );

  const pendingRequestsCount = (pendingInvites || []).filter(i => i.status === "pending").length;

  const getTabBadgeCount = useCallback((tabId: string) => {
    if (isAdmin) {
      return 0;
    }
    if (tabId === "profile") {
      return pendingRequestsCount;
    }
    if (tabId === "events") {
      return (events || []).filter(e => isItemUnreadForNavbar(e.id, e.created_at, "events")).length;
    }
    if (tabId === "winners") {
      return (winners || []).filter(w => isItemUnreadForNavbar(w.id, w.created_at ?? new Date(0).toISOString(), "winners")).length;
    }
    if (tabId === "index") {
      return (announcements || []).filter(a => isItemUnreadForNavbar(a.id, a.created_at, "index")).length;
    }
    return 0;
  }, [isAdmin, pendingRequestsCount, events, winners, announcements, isItemUnreadForNavbar]);

  const horizontalPadding = 16;
  const availableWidth = width - (horizontalPadding * 2);
  const tabWidth = availableWidth / tabs.length; 
  const indicatorHeight = 48; 
  const tabHeight = 60; 
  const paddingTop = 8; 

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          translateX: withTiming(activeTabIndex * tabWidth, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }) 
        }
      ],
    };
  });

  return (
    <View style={styles.wrapper}>
      <View 
        style={[
          styles.container, 
          { 
            backgroundColor: themeColors.surface,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingHorizontal: horizontalPadding,
            paddingTop: paddingTop,
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.indicatorContainer, 
            { width: tabWidth, height: tabHeight, top: paddingTop },
            indicatorStyle
          ]}
        >
           <View style={[styles.indicatorPill, { backgroundColor: themeColors.primary, width: tabWidth * 0.85, height: indicatorHeight }]} />
        </Animated.View>

        {tabs.map((tab, index) => {
          const isActive = activeTabIndex === index;
          const badgeCount = getTabBadgeCount(tab.id);
          const isRequestBadge = tab.id === "profile" && badgeCount > 0;
          
          return (
            <Pressable
              key={tab.id}
              onPress={() => navigateTo(tab.id)}
              style={[styles.tabPressable, { height: tabHeight }]}
            >
              <View>
                <MaterialIcons
                  name={tab.icon as any}
                  size={28}
                  color={isActive ? themeColors.white : themeColors.muted}
                />
                {badgeCount > 0 ? (
                  <View style={[styles.badge, isRequestBadge && { backgroundColor: "#F59E0B" }, { borderColor: themeColors.surface }]}>
                    <Text style={styles.badgeText}>{badgeCount > 99 ? "99+" : badgeCount}</Text>
                  </View>
                ) : null}
                {tab.id === "events" && pendingRequestsCount > 0 ? (
                  <View style={[styles.badge, { backgroundColor: "#F59E0B", right: undefined, left: -8, borderColor: themeColors.surface }]}>
                    <Text style={styles.badgeText}>{pendingRequestsCount > 99 ? "99+" : pendingRequestsCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  tabPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  indicatorContainer: {
    position: "absolute",
    left: 16,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  indicatorPill: {
    borderRadius: 24,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
