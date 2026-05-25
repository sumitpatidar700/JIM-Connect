import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { useAnnouncementsQuery } from "@/src/hooks/queries/useAnnouncementsQuery";
import { useUpcomingEventsQuery } from "@/src/hooks/queries/useUpcomingEventsQuery";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { announcementService } from "@/src/services/announcement-service";
import { eventService } from "@/src/services/event-service";
import { useAuthStore } from "@/src/store/auth-store";
import { useBadgeStore } from "@/src/store/badge-store";
import { useAppSettingsStore } from "@/src/store/settings-store";
import {
    colors,
    radii,
    shadows,
    spacing,
    typography,
} from "@/src/theme/tokens";
import { getDisplayFirstName, getInitials } from "@/src/utils/auth";
import { formatClock, formatDashboardDate } from "@/src/utils/date";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { getResponsiveFontSize } from "@/src/utils/responsive";
import { useThemeColors } from "@/src/utils/settings-effects";

const { width } = Dimensions.get("window");

type QuickAction = {
  color: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  id: string;
  label: string;
  onPress: () => void;
};

type OverviewStat = {
  color: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  label: string;
  value: string;
};

type ActivityItem = {
  color: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  subtitle: string;
  title: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const profile = useAuthStore((state) => state.profile);
  const { isItemNewOnScreen, markItemAsSeen } = useBadgeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    refetch: refetchAnnouncements,
  } = useAnnouncementsQuery();
  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useUpcomingEventsQuery(10);
  const {
    data: winners = [],
    isLoading: winnersLoading,
    refetch: refetchWinners,
  } = useWinnersQuery();
  const announcementAlerts = useAppSettingsStore(
    (state) => state.announcementAlerts,
  );
  const eventAlerts = useAppSettingsStore((state) => state.eventAlerts);
  const profileVisibility = useAppSettingsStore(
    (state) => state.profileVisibility,
  );
  const pushNotifications = useAppSettingsStore(
    (state) => state.pushNotifications,
  );
  const registrationsOpen = useAppSettingsStore(
    (state) => state.registrationsOpen,
  );
  const visibleAnnouncements = useMemo(
    () => (pushNotifications && announcementAlerts ? announcements : []),
    [announcementAlerts, announcements, pushNotifications],
  );
  const visibleEvents = useMemo(
    () => (pushNotifications && eventAlerts ? events : []),
    [eventAlerts, events, pushNotifications],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetchEvents();
      refetchAnnouncements();
      refetchWinners();
    }, [refetchEvents, refetchAnnouncements, refetchWinners])
  );

  useEffect(() => {
    const announcementsChannel = announcementService.subscribeToAnnouncements(
      () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.announcements,
        });
      },
    );
    const eventsChannel = eventService.subscribeToEvents(() => {
      void queryClient.invalidateQueries({ queryKey: ["events"] });
      void refetchEvents();
      void queryClient.invalidateQueries({ queryKey: ["events"] });
    });

    return () => {
      announcementService.unsubscribe(announcementsChannel);
      eventService.unsubscribe(eventsChannel);
    };
  }, [queryClient]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) {
      return events;
    }

    const query = searchQuery.toLowerCase();
    return events.filter(
      (event) =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query),
    );
  }, [events, searchQuery]);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        color: themeColors.accentBlue,
        icon: "calendar",
        id: "events",
        label: t("events"),
        onPress: () => router.push("/(app)/(tabs)/events"),
      },
      {
        color: themeColors.accentAmber,
        icon: "star.fill",
        id: "winners",
        label: t("winners"),
        onPress: () => router.push("/(app)/(tabs)/winners"),
      },
      {
        color: themeColors.accentGreen,
        icon: "archive",
        id: "archive",
        label: t("archive"),
        onPress: () => router.push("/(app)/(tabs)/repository"),
      },
      {
        color: themeColors.surfaceAlt,
        icon:
          profile?.role === "admin"
            ? ("checkmark.fill" as React.ComponentProps<
                typeof IconSymbol
              >["name"])
            : "megaphone.fill",
        id: "notices",
        label: profile?.role === "admin" ? "Admin" : "Notices",
        onPress: () =>
          router.push(
            profile?.role === "admin"
              ? "/(app)/(tabs)/admin-dashboard"
              : "/(app)/notices",
          ),
      },
    ],
    [profile?.role, router, t, themeColors],
  );

  const overviewStats = useMemo<OverviewStat[]>(
    () => [
      {
        color: themeColors.accentBlue,
        icon: "megaphone.fill",
        label: t("announcements"),
        value: `${visibleAnnouncements.length}`,
      },
      {
        color: themeColors.accentAmber,
        icon: "event" as React.ComponentProps<typeof IconSymbol>["name"],
        label: t("upcomingEvents"),
        value: `${visibleEvents.length}`,
      },
      {
        color: themeColors.accentGreen,
        icon: "checkmark",
        label: "Current Time",
        value: formatClock(now),
      },
      {
        color: themeColors.surfaceAlt,
        icon:
          profile?.role === "admin"
            ? ("checkmark.fill" as React.ComponentProps<
                typeof IconSymbol
              >["name"])
            : "star.fill",
        label: "Access",
        value: profile?.role === "admin" ? "Admin" : "Student",
      },
    ],
    [
      now,
      profile?.role,
      t,
      themeColors,
      visibleAnnouncements.length,
      visibleEvents.length,
    ],
  );

  const activityFeed = useMemo<ActivityItem[]>(() => {
    const items: (ActivityItem & { date: Date })[] = [];

    // Announcements
    announcements.forEach(a => {
        items.push({
            color: themeColors.accentBlue,
            icon: "megaphone.fill",
            subtitle: "New Announcement",
            title: a.title,
            date: new Date(a.created_at)
        });
    });

    // Winners
    winners.forEach(w => {
        const eventData = (w as any).events || (w as any).event;
        items.push({
            color: themeColors.accentGreen,
            icon: "star.fill",
            subtitle: `Winners announced: ${eventData?.title || 'Event'}`,
            title: `${w.name} secured ${w.position}`,
            date: new Date(w.created_at || Date.now())
        });
    });

    // Events (Reg Status)
    events.forEach(e => {
        const now = new Date();
        const regDeadline = e.registration_until ? new Date(e.registration_until) : new Date(e.date);
        const isRegClosed = regDeadline < now || e.registrations_paused;
        
        items.push({
            color: isRegClosed ? themeColors.muted : themeColors.accentAmber,
            icon: isRegClosed ? "lock.fill" : "calendar.badge.plus",
            subtitle: isRegClosed ? "Registration Closed" : "Registration Open",
            title: e.title,
            date: new Date(e.created_at)
        });
    });

    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 4);
  }, [announcements, winners, events, themeColors]);

  if (announcementsLoading || eventsLoading || winnersLoading) {
    return (
      <LoadingState fullScreen message="Pulling the latest campus feed..." />
    );
  }

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={themeColors.primary}
          onRefresh={() => {
            setRefreshing(true);
            void Promise.all([refetchAnnouncements(), refetchEvents(), refetchWinners()]).finally(
              () => setRefreshing(false),
            );
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: themeColors.text }]}>
            {t("hey")}{" "}
            {profileVisibility
              ? getDisplayFirstName(profile?.name, profile?.email)
              : "Campus Member"}
          </Text>
          <Text style={[styles.schoolLine, { color: themeColors.muted }]}>
            Jaipuria Institute of Management, Indore
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
          >
            <IconSymbol
              color={themeColors.text}
              name="notifications-outline"
              size={20}
            />
            {pushNotifications ? (
              <View
                style={[
                  styles.notificationDot,
                  {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.surface,
                  },
                ]}
              />
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/(tabs)/profile")}
            style={[styles.avatar, { backgroundColor: themeColors.text }]}
          >
            {profileVisibility && profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[styles.avatarText, { color: themeColors.background }]}
              >
                {profileVisibility ? getInitials(profile?.name) : "JC"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
            },
          ]}
        >
          <IconSymbol
            color={themeColors.muted}
            name="search-outline"
            size={18}
          />
          <TextInput
            placeholder={t("searchHome")}
            placeholderTextColor={themeColors.muted}
            style={[styles.searchInput, { color: themeColors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <Panel
        style={[styles.heroCard, { backgroundColor: themeColors.surfaceAlt }]}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTimeBlock}>
            <Text style={[styles.heroTimeValue, { color: themeColors.text }]}>
              {formatClock(now)}
            </Text>
            <Text style={[styles.heroTimeDate, { color: themeColors.muted }]}>
              {formatDashboardDate(now)}
            </Text>
          </View>
          <Pill
            label={profile?.role === "admin" ? "Admin" : "Student"}
            tone="dark"
          />
        </View>
        <Text style={[styles.heroTitle, { color: themeColors.text }]}>
          A sharper daily dashboard for Jaipuria Institute of Management,
          Indore.
        </Text>
        <Text style={[styles.heroBody, { color: themeColors.muted }]}>
          Track announcements, catch upcoming events, and jump into the right
          action without digging through screens.
        </Text>
      </Panel>

      <View style={styles.quickActionsSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t("quickActions")}
        </Text>
        <View style={styles.quickActionsRow}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.8}
              onPress={action.onPress}
              style={styles.quickActionItem}
            >
              <View
                style={[
                  styles.quickActionIconWrap,
                  { backgroundColor: action.color },
                ]}
              >
                <IconSymbol
                  color={themeColors.text}
                  name={action.icon}
                  size={22}
                />
              </View>
              <Text
                style={[styles.quickActionLabel, { color: themeColors.text }]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.overviewSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t("overview")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/(tabs)/events")}
          >
            <Text style={[styles.sectionLink, { color: themeColors.primary }]}>
              {t("seeAll")}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          {overviewStats.map((item) => (
            <View
              key={item.label}
              style={[styles.statCard, { backgroundColor: item.color }]}
            >
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: themeColors.surface },
                ]}
              >
                <IconSymbol
                  color={themeColors.text}
                  name={item.icon}
                  size={18}
                />
              </View>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {item.value}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.activitySection}>
        <Text
          style={[
            styles.sectionTitle,
            styles.activityHeading,
            { color: themeColors.text },
          ]}
        >
          Campus Pulse
        </Text>
        <Panel>
          {activityFeed.length === 0 ? (
            <EmptyState
              message={t("nothingNewYetMessage")}
              title={t("nothingNewYet")}
            />
          ) : (
            activityFeed.map((item, index) => (
              <View
                key={`${item.title}-${index}`}
                style={[
                  styles.activityItem,
                  index === activityFeed.length - 1 && styles.activityItemLast,
                ]}
              >
                <View
                  style={[
                    styles.activityIconWrap,
                    { backgroundColor: item.color },
                  ]}
                >
                  <IconSymbol
                    color={themeColors.text}
                    name={item.icon}
                    size={18}
                  />
                </View>
                <View style={styles.activityText}>
                  <Text
                    style={[styles.activityTitle, { color: themeColors.text }]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.activitySubtitle,
                      { color: themeColors.muted },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <IconSymbol
                  color={themeColors.muted}
                  name="chevron.right"
                  size={16}
                />
              </View>
            ))
          )}
        </Panel>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(app)/student-logs")}
          style={styles.viewAllRedirect}
        >
          <Text style={[styles.viewAllRedirectText, { color: themeColors.primary }]}>
            View All Activity
          </Text>
          <IconSymbol 
            color={themeColors.primary} 
            name="chevron.right" 
            size={16} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.eventsSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t("exploreModules")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/(tabs)/events")}
          >
            <Text style={[styles.sectionLink, { color: themeColors.primary }]}>
              {t("seeAll")}
            </Text>
          </TouchableOpacity>
        </View>
        {filteredEvents.length === 0 ? (
          <EmptyState message={t("noEventsSearch")} title={t("nothingFound")} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventCarousel}
          >
            {filteredEvents.map((event) => (
              <View key={event.id} style={styles.featureCard}>
                <Panel style={styles.featureCardInner}>
                  <View style={styles.featureTopRow}>
                    <Pill label="JIM Indore Event" tone="brand" />
                    <TouchableOpacity activeOpacity={0.8}>
                      <Ionicons
                        color={themeColors.muted}
                        name="heart-outline"
                        size={18}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[styles.featureTitle, { color: themeColors.text }]}
                  >
                    {event.title}
                  </Text>
                  <Text
                    style={[
                      styles.featureSubtitle,
                      { color: themeColors.muted },
                    ]}
                  >
                    {formatEventDate(event.date)} • {event.venue}
                  </Text>
                  <Text
                    numberOfLines={3}
                    style={[styles.featureBody, { color: themeColors.muted }]}
                  >
                    {event.description}
                  </Text>
                  <View style={styles.featureFooter}>
                    <PrimaryButton
                      label="View Event"
                      onPress={() =>
                        router.push(
                          profile?.role === "admin"
                            ? "/(app)/(tabs)/admin-dashboard"
                            : "/(app)/settings",
                        )
                      }
                      variant="secondary"
                    />
                  </View>
                </Panel>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.feedSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {t("announcements")}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/notices")}
          >
            <Text style={[styles.sectionLink, { color: themeColors.primary }]}>
              {t("seeAll")}
            </Text>
          </TouchableOpacity>
        </View>
        {visibleAnnouncements.length === 0 ? (
          <EmptyState
            message={
              pushNotifications && announcementAlerts
                ? t("feedIsQuietMessage")
                : t("announcementsHiddenMessage")
            }
            title={
              pushNotifications && announcementAlerts
                ? t("feedIsQuiet")
                : t("announcementsHidden")
            }
          />
        ) : (
          visibleAnnouncements.slice(0, 2).map((announcement) => {
            const isNew = isItemNewOnScreen(announcement.id, announcement.created_at, "index");
            return (
              <TouchableOpacity
                key={announcement.id}
                activeOpacity={0.8}
                onPress={() => {
                  markItemAsSeen(announcement.id);
                  router.push("/(app)/notices");
                }}
              >
                <Panel style={styles.feedCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={[styles.feedTitle, { color: themeColors.text, marginBottom: 0, flex: 1 }]}>
                      {announcement.title}
                    </Text>
                    {isNew ? (
                      <Pill label="NEW" tone="danger" />
                    ) : null}
                  </View>
                  <Text style={[styles.feedMeta, { color: themeColors.muted }]}>
                    {formatEventDate(announcement.created_at)}
                  </Text>
                  <Text style={[styles.feedBody, { color: themeColors.muted }]}>
                    {announcement.description}
                  </Text>
                </Panel>
              </TouchableOpacity>
            );
          })
        )}
        {visibleAnnouncements.length > 2 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/notices")}
            style={styles.viewAllRedirect}
          >
            <Text style={[styles.viewAllRedirectText, { color: themeColors.primary }]}>
              View All Notices
            </Text>
            <IconSymbol 
              color={themeColors.primary} 
              name="chevron.right" 
              size={16} 
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  activityIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  activityItem: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  activityItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  activitySection: {
    marginBottom: spacing.xl,
  },
  activityHeading: {
    marginBottom: spacing.md,
  },
  activitySubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.text,
    borderRadius: radii.round,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.semiBold,
    fontSize: 16,
  },
  avatarImage: {
    borderRadius: radii.round,
    height: "100%",
    width: "100%",
  },
  eventCarousel: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  eventsSection: {
    marginBottom: spacing.xl,
  },
  featureBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  featureCard: {
    width: width * 0.82,
  },
  featureCardInner: {
    minHeight: 230,
  },
  featureFooter: {
    marginTop: "auto",
  },
  featureSubtitle: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  featureTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 19,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  featureTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  feedBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  feedCard: {
    marginBottom: spacing.md,
  },
  feedMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  viewAllRedirect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  viewAllRedirectText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  feedSection: {
    marginBottom: spacing.xl,
  },
  feedHeading: {
    marginBottom: spacing.md,
  },
  feedTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
    ...shadows.card,
  },
  greeting: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: getResponsiveFontSize(19, 16, 21),
    lineHeight: 24,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  heroCard: {
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xs,
  },
  heroTimeBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroTimeDate: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  heroTimeValue: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 15,
    marginTop: spacing.md,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  notificationDot: {
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    position: "absolute",
    right: 10,
    top: 10,
    width: 10,
  },
  overviewSection: {
    marginBottom: spacing.lg,
  },
  quickActionIconWrap: {
    alignItems: "center",
    borderRadius: 20,
    height: 62,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 62,
  },
  quickActionItem: {
    alignItems: "center",
    width: "22%",
  },
  quickActionLabel: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(12, 11, 13),
    // marginBottom: spacing.xs,
    textAlign: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
    justifyContent: "space-between",
  },
  quickActionsSection: {
    marginBottom: spacing.lg,
  },
  schoolLine: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(13, 12, 14),
    marginTop: 4,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(14, 13, 15),
  },
  searchRow: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 0,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionLink: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(13, 12, 14),
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: getResponsiveFontSize(17, 16, 18),
  },
  statCard: {
    borderRadius: 24,
    minHeight: 138,
    padding: spacing.lg,
    width: (width - spacing.lg * 2 - spacing.md) / 2,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 36,
  },
  statLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(13, 11, 14),
    marginTop: 6,
  },
  statValue: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: getResponsiveFontSize(18, 16, 20),
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
});
