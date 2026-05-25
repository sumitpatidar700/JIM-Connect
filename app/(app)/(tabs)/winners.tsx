import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { useBadgeStore } from "@/src/store/badge-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";

// Position color mapping function
const getPositionColor = (position: string) => {
  const pos = position.toLowerCase();

  switch (pos) {
    case "1st":
    case "first":
    case "1":
      return {
        bg: "#FFD700", // Gold
        text: "#1A1A1A",
        pillBg: "#FFA500",
        pillText: "#FFFFFF",
        accent: "#FF8C00",
        tone: "brand",
      };
    case "2nd":
    case "second":
    case "2":
      return {
        bg: "#C0C0C0", // Silver
        text: "#1A1A1A",
        pillBg: "#808080",
        pillText: "#FFFFFF",
        accent: "#696969",
        tone: "default",
      };
    case "3rd":
    case "third":
    case "3":
      return {
        bg: "#CD7F32", // Bronze
        text: "#FFFFFF",
        pillBg: "#8B4513",
        pillText: "#FFFFFF",
        accent: "#A0522D",
        tone: "default",
      };
    default:
      return {
        bg: "#F0F0F0", // Light gray for other positions
        text: "#1A1A1A",
        pillBg: "#888888",
        pillText: "#FFFFFF",
        accent: "#666666",
        tone: "default",
      };
  }
};

export default function WinnersScreen() {
  const router = useRouter();
  const { data: winners = [], isLoading } = useWinnersQuery();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const { isItemNewOnScreen, markItemAsSeen } = useBadgeStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Group winners by events and filter by search
  const { groupedWinners, filteredEvents } = useMemo(() => {
    // Group winners by event
    const grouped = winners.reduce<Record<string, typeof winners>>(
      (acc, winner) => {
        const eventId = winner.event_id;
        if (!acc[eventId]) {
          acc[eventId] = [];
        }
        acc[eventId].push(winner);
        return acc;
      },
      {},
    );

    // Get unique events for filtering
    const events = Object.values(grouped).map((eventWinners) => {
      const winner = eventWinners[0];
      const eventData = (winner as any)?.events || (winner as any)?.event;
      return {
        id: winner?.event_id,
        title: eventData?.title || t("campusEvent"),
        date: eventData?.date,
        venue: eventData?.venue,
      };
    });

    // Filter events by search query
    const filtered = events.filter((event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return {
      groupedWinners: grouped,
      filteredEvents: filtered,
    };
  }, [winners, searchQuery, t]);

  if (isLoading) {
    return <LoadingState fullScreen message={t("loadingWinners")} />;
  }

  return (
    <Screen scrollable>
      <Text style={[styles.title, { color: themeColors.text }]}>
        {t("winnersWall")}
      </Text>
      <Text style={[styles.subtitle, { color: themeColors.muted }]}>
        {t("winnersIntro")}
      </Text>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <TextField
          label=""
          placeholder="Search events..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          rightIcon={
            <IconSymbol color={themeColors.muted} name="search" size={16} />
          }
        />
      </View>

      {filteredEvents.length === 0 ? (
        <EmptyState
          message={
            searchQuery ? t("noEventsFound") : t("noWinnerEntriesMessage")
          }
          title={searchQuery ? t("noEventsFound") : t("noWinnerEntries")}
        />
      ) : (
        filteredEvents.map((event) => {
          const eventWinners = groupedWinners[event.id!] || [];
          return (
            <Panel key={event.id} style={styles.eventCard}>
              {/* Event Header */}
              <View style={styles.eventHeader}>
                <View style={styles.eventInfo}>
                  <Text
                    style={[styles.eventTitle, { color: themeColors.text }]}
                  >
                    {event.title}
                  </Text>
                  <Text
                    style={[styles.eventMeta, { color: themeColors.muted }]}
                  >
                    {formatEventDate(event.date!)} • {event.venue}
                  </Text>
                </View>
                <Pill
                  label={`${eventWinners.length} Winner${eventWinners.length === 1 ? "" : "s"}`}
                  tone="success"
                />
              </View>

              {/* Winners List */}
              <View style={styles.winnersList}>
                {eventWinners.map((winner) => {
                  const positionColor = getPositionColor(winner.position);
                  const isNew = isItemNewOnScreen(winner.id, winner.created_at ?? new Date(0).toISOString(), "winners");
                  return (
                    <Pressable
                      key={winner.id}
                      onPress={() => {
                        markItemAsSeen(winner.id);
                        if (winner.user_id) {
                          router.push(`/(app)/student-detail?userId=${winner.user_id}`);
                        }
                      }}
                      style={styles.winnerItem}
                    >
                      <View style={styles.winnerInfo}>
                        <View style={styles.winnerNameRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                            {isNew ? (
                              <Pill label="NEW" tone="danger" />
                            ) : null}
                            {winner.users?.avatar_url || winner.image_url ? (
                              <Image 
                                source={{ uri: winner.users?.avatar_url || winner.image_url! }} 
                                style={{ width: 32, height: 32, borderRadius: 16 }} 
                              />
                            ) : (
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                                  {((winner.users?.name ?? winner.name) || "W").charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text
                              style={[
                                styles.winnerName,
                                { color: themeColors.text, flex: undefined },
                              ]}
                            >
                              {winner.users?.name ?? winner.name}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.positionBadge,
                              { backgroundColor: positionColor.pillBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.positionBadgeText,
                                { color: positionColor.pillText },
                              ]}
                            >
                              {winner.position}
                            </Text>
                          </View>
                        </View>
                        {winner.image_url && (
                          <View style={styles.assetContainer}>
                            <IconSymbol
                              color={positionColor.accent}
                              name="paperplane.fill"
                              size={12}
                            />
                            <Text
                              style={[
                                styles.asset,
                                { color: positionColor.accent },
                              ]}
                            >
                              Entry asset available
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </Panel>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  asset: {
    fontFamily: typography.medium,
    fontSize: 12,
    opacity: 0.8,
  },
  assetContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border + "30",
  },
  card: {
    marginBottom: spacing.md,
  },
  eventCard: {
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  eventHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "20",
  },
  eventIconWrap: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  eventInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  eventTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
    marginBottom: 4,
    lineHeight: 24,
  },
  eventMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  winnersList: {
    gap: spacing.xs,
  },
  winnerItem: {
    paddingVertical: 0,
  },
  positionIcon: {
    alignItems: "center",
    borderRadius: 6,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  positionText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerNameRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  winnerName: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  positionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.xl,
    minWidth: 40,
    alignItems: "center",
  },
  positionBadgeText: {
    fontFamily: typography.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 24,
    marginBottom: 0,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 0,
  },
  searchWrapper: {
    marginTop: -spacing.xs,
  },
  textBlock: {
    flex: 1,
    marginRight: spacing.md,
  },
  topRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
