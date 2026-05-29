import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { GlobalSearchAutocomplete } from "@/components/ui/GlobalSearchAutocomplete";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { useAnnouncementsQuery } from "@/src/hooks/queries/useAnnouncementsQuery";
import { useEventSearchQuery } from "@/src/hooks/queries/useEventSearchQuery";
import { useRepositoryQuery } from "@/src/hooks/queries/useRepositoryQuery";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { useRecentRegistrationsQuery } from "@/src/hooks/queries/useRecentRegistrationsQuery";
import { useUsersQuery } from "@/src/hooks/queries/useUsersQuery";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";
import { getResponsiveFontSize } from "@/src/utils/responsive";

type IconName = React.ComponentProps<typeof IconSymbol>["name"];

type AdminAction = {
  color: string;
  icon: IconName;
  id: string;
  label: string;
  onPress: () => void;
};

type AdminStat = {
  color: string;
  icon: IconName;
  label: string;
  value: string;
};

type PulseItem = {
  color: string;
  icon: IconName;
  subtitle: string;
  title: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const activeSession = useAuthStore((state) => state.activeSession);
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const {
    data: announcements = [],
    isLoading: announcementsLoading,
    refetch: refetchAnnouncements,
  } = useAnnouncementsQuery();
  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEventSearchQuery("");
  const {
    data: winners = [],
    isLoading: winnersLoading,
    refetch: refetchWinners,
  } = useWinnersQuery();
  const {
    data: repositoryItems = [],
    isLoading: repositoryLoading,
    refetch: refetchRepository,
  } = useRepositoryQuery();
  const {
    data: recentRegistrations = [],
    isLoading: registrationsLoading,
    refetch: refetchRegistrations,
  } = useRecentRegistrationsQuery(5);
  const {
    data: allUsers = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useUsersQuery();

  const loading = announcementsLoading || eventsLoading;

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const refreshDashboard = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchAnnouncements(),
      refetchEvents(),
      refetchWinners(),
      refetchRepository(),
      refetchRegistrations(),
      refetchUsers(),
    ]).finally(() => setRefreshing(false));
  };

  const quickActions = useMemo<AdminAction[]>(
    () => [
      {
        color: themeColors.accentBlue,
        icon: "campaign",
        id: "notices",
        label: t("announcements"),
        onPress: () => router.push("/(app)/(tabs)/admin-announcements"),
      },
      {
        color: themeColors.accentAmber,
        icon: "calendar",
        id: "events",
        label: t("events"),
        onPress: () => router.push("/(app)/(tabs)/admin-events"),
      },

      {
        color: themeColors.surfaceAlt,
        icon: "archive",
        id: "archive",
        label: t("archive"),
        onPress: () => router.push("/(app)/(tabs)/admin-results"),
      },
      {
        color: themeColors.accentGreen,
        icon: "people-outline",
        id: "students",
        label: "Students",
        onPress: () => router.push("/(app)/admin-students"),
      },
    ],
    [router, t, themeColors],
  );

  const overviewStats = useMemo<AdminStat[]>(
    () => [
      {
        color: themeColors.accentBlue,
        icon: "campaign",
        label: t("liveNotices"),
        value: `${announcements.length}`,
      },
      {
        color: themeColors.accentAmber,
        icon: "calendar",
        label: t("eventsQueue"),
        value: `${events.length}`,
      },
      {
        color: themeColors.accentGreen,
        icon: "star.fill",
        label: t("results"),
        value: `${winners.length}`,
      },
      {
        color: themeColors.surfaceAlt,
        icon: "archive",
        label: t("archiveEntries"),
        value: `${repositoryItems.length}`,
      },
    ],
    [
      announcements.length,
      events.length,
      repositoryItems.length,
      t,
      themeColors,
      winners.length,
    ],
  );

  const pulseItems = useMemo<PulseItem[]>(() => {
    const items: (PulseItem & { date: Date })[] = [];

    // Announcements
    announcements.slice(0, 2).forEach(a => {
      items.push({
        color: themeColors.accentBlue,
        icon: "megaphone.fill",
        subtitle: formatEventDate(a.created_at),
        title: `Notice: ${a.title}`,
        date: new Date(a.created_at)
      });
    });

    // Registrations
    recentRegistrations.forEach(r => {
      items.push({
        color: themeColors.primary,
        icon: "checkmark",
        subtitle: `${formatEventDate(r.created_at)} • ${r.events?.title || "Event"}`,
        title: `${r.users?.name || "Student"} joined an event`,
        date: new Date(r.created_at)
      });
    });

    // New Users
    allUsers.slice(0, 3).forEach(u => {
      // Only show if joined in last 48 hours for better relevance
      const joinedAt = new Date(u.created_at);
      if (Date.now() - joinedAt.getTime() < 1000 * 60 * 60 * 48) {
        items.push({
          color: themeColors.accentGreen,
          icon: "person.badge.plus",
          subtitle: `Joined ${formatEventDate(u.created_at)}`,
          title: `${u.name.split(' ')[0]} joined the community`,
          date: joinedAt
        });
      }
    });

    // Events
    events.slice(0, 2).forEach(e => {
      items.push({
        color: themeColors.accentAmber,
        icon: "calendar",
        subtitle: `${formatEventDate(e.date)} • ${e.venue}`,
        title: `Upcoming: ${e.title}`,
        date: new Date(e.created_at) // use creation date for log order
      });
    });

    return items
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3)
      .map(({ date, ...rest }) => rest);
  }, [announcements, events, themeColors, recentRegistrations, allUsers]);

  if (profile?.role !== "admin") {
    return (
      <Screen>
        <EmptyState
          message={t("adminAccessRequiredMessage")}
          title={t("adminAccessRequired")}
        />
      </Screen>
    );
  }

  if (loading) {
    return <LoadingState fullScreen message={t("adminDashboardLoading")} />;
  }

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={themeColors.primary}
          onRefresh={() => {
            void refreshDashboard();
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: themeColors.text }]}>
            {t("hey")} {getDisplayFirstName(profile?.name, profile?.email)}
          </Text>
          <Text style={[styles.schoolLine, { color: themeColors.muted }]}>
            Jaipuria Institute of Management, Indore
          </Text>
          {activeSession?.name ? (
            <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary, marginTop: 2 }}>
              Session: {activeSession.name}
            </Text>
          ) : null}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/notification-settings" as any)}
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
            <View
              style={[
                styles.notificationDot,
                {
                  backgroundColor: themeColors.primary,
                  borderColor: themeColors.surface,
                },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/(tabs)/profile")}
            style={[styles.avatar, { backgroundColor: themeColors.text }]}
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text
                style={[styles.avatarText, { color: themeColors.background }]}
              >
                {getInitials(profile?.name)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchRow, { zIndex: 100 }]}>
        <GlobalSearchAutocomplete />
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
          <Pill label={t("adminMode")} tone="dark" />
        </View>
        <Text style={[styles.heroTitle, { color: themeColors.text }]}>
          {t("quickAdminIntro")}
        </Text>
        <Text style={[styles.heroBody, { color: themeColors.muted }]}>
          {t("quickAdminBody")}
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
                  name={action.icon as any}
                  size={26}
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
            {t("operationsSnapshot")}
          </Text>
        </View>
        <View style={styles.statsGrid}>
          {overviewStats.map((item) => (
            <View
              key={item.label}
              style={[styles.statCard, { backgroundColor: item.color }]}
            >
              <View
                style={[
                  styles.statLineAccent,
                  { backgroundColor: themeColors.primary },
                ]}
              />
              <View
                style={[
                  styles.statIcon,
                  { backgroundColor: themeColors.surface },
                ]}
              >
                <IconSymbol
                  color={themeColors.text}
                  name={item.icon as any}
                  size={20}
                />
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>
                  {item.value}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.statLabel, { color: themeColors.muted }]}
                >
                  {item.label}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Panel
        style={[
          styles.managementCard,
          { backgroundColor: themeColors.primary },
        ]}
      >
        <View style={styles.managementIconWrap}>
           <IconSymbol color={themeColors.white} name="people-outline" size={28} />
        </View>
        <View style={styles.managementTextWrap}>
          <Text style={[styles.managementTitle, { color: themeColors.white }]}>
            Student Directory
          </Text>
          <Text style={[styles.managementBody, { color: "rgba(255,255,255,0.8)" }]}>
            Search, contact, and manage your campus student base from one central control board.
          </Text>
          <View style={styles.managementAction}>
             <PrimaryButton 
               label="Open Student Directory" 
               onPress={() => router.push("/(app)/admin-students")}
               variant="secondary"
               icon="chevron.right"
             />
          </View>
        </View>
      </Panel>

      <View style={styles.pulseSection}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
          {t("publishingPulse")}
        </Text>
        <Panel style={styles.pulseSectionContent}>
          {pulseItems.length === 0 ? (
            <EmptyState
              message="Your latest publishing activity will show up here as soon as content goes live."
              title="Nothing moving yet"
            />
          ) : (
            pulseItems.map((item, index) => (
              <View
                key={`${item.title}-${index}`}
                style={[
                  styles.pulseItem,
                  index === pulseItems.length - 1 && styles.pulseItemLast,
                ]}
              >
                <View
                  style={[
                    styles.pulseIconWrap,
                    { backgroundColor: item.color },
                  ]}
                >
                  <IconSymbol
                    color={themeColors.text}
                    name={item.icon as any}
                    size={20}
                  />
                </View>
                <View style={styles.pulseText}>
                  <Text
                    style={[styles.pulseTitle, { color: themeColors.text }]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[styles.pulseSubtitle, { color: themeColors.muted }]}
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

          {pulseItems.length > 0 && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push("/(app)/admin-logs")}
              style={[styles.viewAllLogs, { borderTopColor: themeColors.border }]}
            >
              <Text style={[styles.viewAllLogsText, { color: themeColors.primary }]}>
                View All Activity
              </Text>
              <IconSymbol color={themeColors.primary} name="chevron.right" size={14} />
            </TouchableOpacity>
          )}
        </Panel>
      </View>




    </Screen>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: spacing.sm,
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
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  heroCard: {
    backgroundColor: "#ECE5D7",
    marginBottom: spacing.lg,
  },
  heroTimeBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  heroTimeDate: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  heroTimeValue: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 20,
    marginTop: 0,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 18,
    lineHeight: 24,
    marginTop: spacing.lg,
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
  managementCard: {
    flexDirection: "row",
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
    borderRadius: 24,
    overflow: "hidden",
  },
  managementIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  managementTextWrap: {
    flex: 1,
  },
  managementTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    marginBottom: 4,
  },
  managementBody: {
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  managementAction: {
    alignItems: "flex-start",
  },
  publishActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingRight: spacing.md,
  },
  publishBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  publishPanel: {
    backgroundColor: colors.surfaceAlt,
    marginBottom: spacing.xl,
  },
  publishTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 18,
  },
  pulseIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pulseItem: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pulseItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  pulseSection: {
    marginBottom: spacing.md,
  },
  pulseSectionContent: {
    marginTop: spacing.sm,
  },
  pulseSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  pulseText: {
    flex: 1,
  },
  pulseTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  quickActionIconWrap: {
    alignItems: "center",
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 68,
  },
  quickActionItem: {
    alignItems: "center",
    width: "24%",
  },
  quickActionLabel: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 12,
    textAlign: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
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
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionLink: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  searchBox: {
    alignItems: "center",
    borderRadius: radii.round,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    fontFamily: typography.regular,
    fontSize: 15,
    height: "100%",
  },
  searchRow: {
    marginBottom: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 17,
  },
  spotlightBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  spotlightCard: {
    width: 300,
  },
  spotlightFooter: {
    marginTop: "auto",
  },
  spotlightMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  spotlightPanel: {
    minHeight: 260,
  },
  spotlightScroll: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  spotlightSection: {
    marginBottom: spacing.xl,
  },
  spotlightTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 18,
    marginTop: spacing.md,
  },
  spotlightTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statCard: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    minHeight: 68,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "relative",
    width: "48%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statLineAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    marginRight: 10,
    marginLeft: 4,
    width: 38,
  },
  statContent: {
    flex: 1,
    justifyContent: "center",
  },
  statLabel: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    marginTop: 1,
  },
  statValue: {
    fontFamily: typography.bold,
    fontSize: 17,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    rowGap: spacing.md,
  },
  viewAllLogs: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    gap: 4,
  },
  viewAllLogsText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  overviewSection: {
    marginBottom: spacing.lg,
  },
});

function getDisplayFirstName(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name.trim().split(" ")[0];
  }

  if (email?.trim()) {
    const localPart = email.trim().split("@")[0] ?? "";
    const normalized = localPart.replace(/[._-]+/g, " ").trim();
    if (normalized) {
      return normalized
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return "There";
}

function getInitials(name?: string | null) {
  const parts = name?.trim().split(" ").filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "AD";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDashboardDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(date);
}
