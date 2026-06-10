import { useRouter } from "expo-router";
import { useMemo, useState, useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View, Modal, ActivityIndicator, ScrollView } from "react-native";

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
import { useAuthStore } from "@/src/store/auth-store";
import { supabase } from "@/src/lib/supabase";
import { eventService } from "@/src/services/event-service";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

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
  const activeSession = useAuthStore((state) => state.activeSession);
  const [teamImages, setTeamImages] = useState<Record<string, string>>({});
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<{
    name: string;
    image_url?: string | null;
    members: { id?: string; name: string; email: string; avatar_url?: string | null }[];
  } | null>(null);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(false);

  useEffect(() => {
    const fetchTeamImages = async () => {
      try {
        const { data: teamsData } = await supabase
          .from('event_teams')
          .select('name, image_url, event_id');

        const imageMap: Record<string, string> = {};
        if (teamsData) {
          teamsData.forEach((t) => {
            if (t.image_url) {
              const key = `${t.event_id}_${t.name.trim().toLowerCase()}`;
              imageMap[key] = t.image_url;
            }
          });
        }
        setTeamImages(imageMap);
      } catch (e) {
        console.error("Error loading team images:", e);
      }
    };
    void fetchTeamImages();
  }, []);

  useEffect(() => {
    const fetchWinnerAvatars = async () => {
      if (winners.length === 0) return;
      try {
        const allMemberNames = winners
          .filter(w => !w.user_id)
          .flatMap(winner => {
            const match = winner.name.match(/\(([^)]+)\)/);
            return match ? match[1].split(',').map(m => m.trim()) : [];
          });

        const individualNames = winners
          .filter(w => w.user_id)
          .map(w => w.users?.name ?? w.name);

        const namesToQuery = Array.from(
          new Set([...allMemberNames, ...individualNames].map(n => n.trim()).filter(Boolean))
        );

        if (namesToQuery.length === 0) return;

        const { data: usersData, error } = await supabase
          .from('users')
          .select('name, avatar_url')
          .in('name', namesToQuery);

        if (error) throw error;

        const avatarMap: Record<string, string> = {};
        if (usersData) {
          usersData.forEach((u) => {
            if (u.name && u.avatar_url) {
              avatarMap[u.name.trim().toLowerCase()] = u.avatar_url;
            }
          });
        }
        setUserAvatars(avatarMap);
      } catch (e) {
        console.error("Error loading targeted avatars:", e);
      }
    };
    void fetchWinnerAvatars();
  }, [winners]);

  const handleGroupWinnerPress = async (winner: any) => {
    try {
      setLoadingGroupDetails(true);
      const teamNamePart = winner.name.split(" (")[0] || winner.name;
      const rows = await eventService.listRegistrationsForEvent(winner.event_id);
      const teamRegs = rows.filter(r => r.event_teams?.name.trim().toLowerCase() === teamNamePart.trim().toLowerCase());
      
      if (teamRegs.length > 0) {
        const teamName = teamRegs[0].event_teams?.name || teamNamePart;
        const groupImageUrl = teamRegs[0].event_teams?.image_url || null;
        const members = teamRegs.map(r => ({
          id: r.user_id,
          name: r.users?.name ?? "Student",
          email: r.users?.email ?? "No email",
          avatar_url: r.users?.avatar_url
        }));
        setSelectedGroupDetails({ name: teamName, members, image_url: groupImageUrl });
      } else {
        const membersPart = winner.name.match(/\(([^)]+)\)/);
        const parsedMembers = membersPart 
          ? membersPart[1].split(",").map((m: string) => ({ name: m.trim(), email: "Fallback info" }))
          : [];
        setSelectedGroupDetails({ name: teamNamePart, members: parsedMembers, image_url: null });
      }
    } catch (e) {
      const teamNamePart = winner.name.split(" (")[0] || winner.name;
      const membersPart = winner.name.match(/\(([^)]+)\)/);
      const parsedMembers = membersPart 
        ? membersPart[1].split(",").map((m: string) => ({ name: m.trim(), email: "Fallback info" }))
        : [];
      setSelectedGroupDetails({ name: teamNamePart, members: parsedMembers, image_url: null });
    } finally {
      setLoadingGroupDetails(false);
    }
  };

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
        max_team_size: eventData?.max_team_size || 1,
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
      {activeSession?.name ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, marginTop: 4 }}>
          <View style={{ backgroundColor: themeColors.primarySoft, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 5 }}>
            <IconSymbol color={themeColors.primary} name="calendar" size={11} />
            <Text style={{ fontFamily: typography.semiBold, fontSize: 11, color: themeColors.primary }}>
              Session: {activeSession.name}
            </Text>
          </View>
        </View>
      ) : null}

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
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <Text
                      style={[styles.eventTitle, { color: themeColors.text, marginBottom: 0, flex: undefined }]}
                    >
                      {event.title}
                    </Text>
                    {event.max_team_size > 1 && (
                      <View style={{ backgroundColor: "#3B82F620", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ color: "#3B82F6", fontSize: 10, fontFamily: typography.semiBold }}>Group Event</Text>
                      </View>
                    )}
                  </View>
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
                  const isGroup = !winner.user_id;
                  const displayName = isGroup ? (winner.name.split(" (")[0] || winner.name) : (winner.users?.name ?? winner.name);
                  
                  const groupImgKey = `${winner.event_id}_${displayName.trim().toLowerCase()}`;
                  const groupImageUrl = teamImages[groupImgKey];
                  const avatarUrl = winner.users?.avatar_url || groupImageUrl || null;

                  const membersPart = isGroup ? winner.name.match(/\(([^)]+)\)/) : null;
                  const parsedMembers = membersPart 
                    ? membersPart[1].split(",").map((m: string) => m.trim())
                    : [];

                  return (
                    <Pressable
                      key={winner.id}
                      onPress={() => {
                        markItemAsSeen(winner.id);
                        if (winner.user_id) {
                          router.push(`/(app)/student-detail?userId=${winner.user_id}`);
                        } else {
                          void handleGroupWinnerPress(winner);
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
                            {isGroup && parsedMembers.length > 0 ? (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                {parsedMembers.slice(0, 3).map((memberName, idx) => {
                                  const memberAvatar = userAvatars[memberName.trim().toLowerCase()];
                                  return (
                                    <View
                                      key={idx}
                                      style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        borderWidth: 1.5,
                                        borderColor: themeColors.surface,
                                        backgroundColor: themeColors.primarySoft,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginLeft: idx > 0 ? -16 : 0,
                                        zIndex: 10 - idx,
                                        overflow: "hidden",
                                      }}
                                    >
                                      {memberAvatar ? (
                                        <Image 
                                          source={{ uri: memberAvatar }} 
                                          style={{ width: "100%", height: "100%" }} 
                                        />
                                      ) : (
                                        <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>
                                          {memberName.charAt(0).toUpperCase()}
                                        </Text>
                                      )}
                                    </View>
                                  );
                                })}
                                {parsedMembers.length > 3 && (
                                  <View
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: 16,
                                      borderWidth: 1.5,
                                      borderColor: themeColors.surface,
                                      backgroundColor: themeColors.surfaceAlt,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginLeft: -16,
                                      zIndex: 7,
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, fontFamily: typography.bold, color: themeColors.text }}>
                                      +{parsedMembers.length - 3}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ) : avatarUrl ? (
                              <Image 
                                source={{ uri: avatarUrl }} 
                                style={{ width: 32, height: 32, borderRadius: 16 }} 
                              />
                            ) : (
                              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                                {isGroup ? (
                                  <IconSymbol name="people-outline" size={16} color={themeColors.primary} />
                                ) : (
                                  <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                                    {(displayName || "W").charAt(0).toUpperCase()}
                                  </Text>
                                )}
                              </View>
                            )}
                            <Text
                              style={[
                                styles.winnerName,
                                { color: themeColors.text, flex: 1 },
                              ]}
                              numberOfLines={1}
                            >
                              {displayName}
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
      {/* Group Info Modal */}
      <Modal
        visible={selectedGroupDetails !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedGroupDetails(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 400, maxHeight: "85%", backgroundColor: themeColors.surface, borderRadius: radii.xl, padding: 20, borderWidth: 1, borderColor: themeColors.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontFamily: typography.bold, fontSize: 18, color: themeColors.text }}>Group Winner Info</Text>
              <Pressable onPress={() => setSelectedGroupDetails(null)} style={{ padding: 4 }}>
                <IconSymbol name="close" size={22} color={themeColors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={true}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16, backgroundColor: themeColors.primarySoft, padding: 12, borderRadius: radii.lg }}>
                {selectedGroupDetails?.image_url ? (
                  <Image
                    source={{ uri: selectedGroupDetails.image_url }}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                  />
                ) : (
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: themeColors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: themeColors.border }}>
                    <IconSymbol name="people-outline" size={30} color={themeColors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary, textTransform: "uppercase" }}>Group Name</Text>
                  <Text style={{ fontSize: 17, fontFamily: typography.bold, color: themeColors.text, marginTop: 2 }}>{selectedGroupDetails?.name}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.muted, marginBottom: 8, textTransform: "uppercase" }}>Group Members</Text>
              <View style={{ gap: 10, marginBottom: 10 }}>
                {selectedGroupDetails?.members?.map((member, index) => (
                  <Pressable
                    key={index}
                    disabled={!member.id}
                    onPress={() => {
                      setSelectedGroupDetails(null);
                      router.push(`/(app)/student-detail?userId=${member.id}`);
                    }}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 6,
                        borderRadius: radii.md,
                        borderBottomWidth: selectedGroupDetails.members && index === selectedGroupDetails.members.length - 1 ? 0 : 1,
                        borderBottomColor: themeColors.border,
                        backgroundColor: pressed ? themeColors.surfaceAlt : "transparent",
                      }
                    ]}
                  >
                    {member.avatar_url ? (
                      <Image source={{ uri: member.avatar_url }} style={{ width: 32, height: 32, borderRadius: 16 }} />
                    ) : (
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.text }}>{member.name.charAt(0).toUpperCase()}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: typography.semiBold, color: themeColors.text }}>{member.name}</Text>
                      <Text style={{ fontSize: 12, fontFamily: typography.regular, color: themeColors.muted }}>{member.email}</Text>
                    </View>
                    {member.id && (
                      <IconSymbol name="chevron.right" size={16} color={themeColors.muted} />
                    )}
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <PrimaryButton
              label="Close"
              onPress={() => setSelectedGroupDetails(null)}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={loadingGroupDetails}
        transparent={true}
        animationType="none"
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      </Modal>
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
