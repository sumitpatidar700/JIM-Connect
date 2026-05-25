import { 
  RefreshControl, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  Pressable 
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { useAnnouncementsQuery } from "@/src/hooks/queries/useAnnouncementsQuery";
import { useBadgeStore } from "@/src/store/badge-store";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";

type SortOption = "newest" | "oldest" | "az";

export default function NoticesScreen() {
  const router = useRouter();
  const { data: announcements = [], isLoading, refetch } = useAnnouncementsQuery();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const { isItemNewOnScreen, markItemAsSeen } = useBadgeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const processedAnnouncements = useMemo(() => {
    let result = [...announcements];

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "az") {
        return a.title.localeCompare(b.title);
      }
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [announcements, searchQuery, sortBy]);

  if (isLoading) {
    return <LoadingState fullScreen message="Loading all notices..." />;
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
            void refetch().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <View style={styles.headerRow}>
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconSymbol color={themeColors.text} name="chevron.left" size={24} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            Campus Notices
          </Text>
          <Text style={[styles.introText, { color: themeColors.muted }]}>
            Official campus updates and academic notices for students.
          </Text>
        </View>
      </View>

      <Panel style={styles.controlPanel}>
        <View style={[styles.searchBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <IconSymbol color={themeColors.muted} name="search" size={16} />
          <TextInput
            placeholder="Search by keyword..."
            placeholderTextColor={themeColors.muted}
            style={[styles.searchInput, { color: themeColors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.sortContainer}>
          <Text style={[styles.controlLabel, { color: themeColors.muted }]}>SORT BY</Text>
          <View style={styles.chipRow}>
            {(["newest", "oldest", "az"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setSortBy(option)}
                style={[
                  styles.sortChip,
                  { 
                    borderColor: sortBy === option ? themeColors.primary : themeColors.border,
                    backgroundColor: sortBy === option ? themeColors.primary : "transparent"
                  }
                ]}
              >
                <Text style={[
                  styles.sortChipText, 
                  { color: sortBy === option ? themeColors.white : themeColors.muted }
                ]}>
                  {option === "newest" ? "Newest" : option === "oldest" ? "Oldest" : "A-Z"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Panel>

      {processedAnnouncements.length === 0 ? (
        <EmptyState
          message={searchQuery ? "No notices match your current filters." : "No official notices have been posted yet."}
          title={searchQuery ? "No matches" : "Feed is Quiet"}
        />
      ) : (
        <View style={styles.listContainer}>
          {processedAnnouncements.map((announcement) => {
            const isNew = isItemNewOnScreen(announcement.id, announcement.created_at, "index");
            return (
              <TouchableOpacity
                key={announcement.id}
                activeOpacity={0.9}
                onPress={() => markItemAsSeen(announcement.id)}
              >
                <Panel style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {isNew ? (
                        <Pill label="NEW" tone="danger" />
                      ) : null}
                      <View style={[styles.dateBadge, { backgroundColor: themeColors.primarySoft }]}>
                         <IconSymbol color={themeColors.primary} name="calendar" size={14} />
                         <Text style={[styles.dateText, { color: themeColors.primary }]}>
                           {formatEventDate(announcement.created_at)}
                         </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {announcement.title}
                  </Text>
                  
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <Text style={[styles.cardBody, { color: themeColors.muted }]}>
                    {announcement.description}
                  </Text>
                  
                  <View style={styles.cardFooter}>
                    <Text style={[styles.readTime, { color: themeColors.muted }]}>
                      Admin
                    </Text>
                  </View>
                </Panel>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -spacing.xs,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: -2,
  },
  introText: {
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  controlPanel: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: 0,
    marginBottom: spacing.md,
    gap: spacing.md,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  sortContainer: {
    gap: spacing.xs,
  },
  controlLabel: {
    fontFamily: typography.bold,
    fontSize: 10,
    letterSpacing: 1,
    marginLeft: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  sortChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.round,
    borderWidth: 1,
  },
  sortChipText: {
    fontFamily: typography.semiBold,
    fontSize: 11,
  },
  listContainer: {
    gap: 12,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontFamily: typography.bold,
    fontSize: 11,
  },
  officialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  officialText: {
    fontFamily: typography.medium,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontFamily: typography.bold,
    fontSize: 17,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  divider: {
    height: 1,
    width: "100%",
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  cardBody: {
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
  },
  cardFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 0,
  },
  readTime: {
    fontFamily: typography.medium,
    fontSize: 11,
    fontStyle: "italic",
    opacity: 0.8,
  },
});
