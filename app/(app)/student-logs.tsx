import { 
  RefreshControl, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  SectionList,
  TextInput,
  ScrollView
} from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { LogDetailModal } from "@/components/ui/LogDetailModal";
import { Panel } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { useAnnouncementsQuery } from "@/src/hooks/queries/useAnnouncementsQuery";
import { useEventSearchQuery } from "@/src/hooks/queries/useEventSearchQuery";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { useThemeColors } from "@/src/utils/settings-effects";
import { colors, spacing, typography } from "@/src/theme/tokens";

type LogItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  color: string;
  date: Date;
  type: 'announcement' | 'event' | 'winner';
  rawItem?: any;
};

export default function StudentLogsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "events" | "notices" | "winners">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const { data: announcements = [], isLoading: al, refetch: ar } = useAnnouncementsQuery();
  const { data: events = [], isLoading: el, refetch: er } = useEventSearchQuery("");
  const { data: winners = [], isLoading: wl, refetch: wr } = useWinnersQuery();

  const isLoading = al || el || wl;

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([ar(), er(), wr()]);
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const allLogs: LogItem[] = [];

    // Announcements
    announcements.forEach(a => {
      allLogs.push({
        id: `ann-${a.id}`,
        title: a.title,
        subtitle: "Campus Notice",
        icon: "megaphone.fill",
        color: themeColors.accentBlue,
        date: new Date(a.created_at),
        type: 'announcement',
        rawItem: a
      });
    });

    // Events (Registrations Status)
    events.forEach(e => {
      const now = new Date();
      const eventDate = new Date(e.date);
      const regDeadline = e.registration_until ? new Date(e.registration_until) : eventDate;
      const isPast = eventDate < now;
      const isRegClosed = regDeadline < now || e.registrations_paused;

      allLogs.push({
        id: `evt-${e.id}`,
        title: e.title,
        subtitle: isPast ? "Event Completed" : (isRegClosed ? "Registrations Closed" : "Registrations Open"),
        icon: isPast ? "calendar" : (isRegClosed ? "lock.fill" : "calendar.badge.plus"),
        color: isRegClosed ? themeColors.muted : themeColors.accentAmber,
        date: new Date(e.created_at),
        type: 'event',
        rawItem: e
      });
    });

    // Winners
    winners.forEach(w => {
      const eventData = (w as any).events || (w as any).event;
      allLogs.push({
        id: `win-${w.id}`,
        title: `Winners Announced: ${eventData?.title || "Event"}`,
        subtitle: `${w.name} secured ${w.position}`,
        icon: "star.fill",
        color: themeColors.accentGreen,
        date: new Date(w.created_at || Date.now()),
        type: 'winner',
        rawItem: w
      });
    });

    // Filter by Type
    const typeFiltered = allLogs.filter(log => {
      if (activeFilter === "all") return true;
      if (activeFilter === "events") return log.type === "event";
      if (activeFilter === "notices") return log.type === "announcement";
      if (activeFilter === "winners") return log.type === "winner";
      return true;
    });

    // Sort
    typeFiltered.sort((a, b) => {
      return sortOrder === "newest" 
        ? b.date.getTime() - a.date.getTime()
        : a.date.getTime() - b.date.getTime();
    });

    // Search Filter
    const query = searchQuery.toLowerCase().trim();
    const filtered = query 
      ? typeFiltered.filter(log => 
          log.title.toLowerCase().includes(query) || 
          log.subtitle.toLowerCase().includes(query)
        )
      : typeFiltered;

    // Group by date
    const groups: Record<string, LogItem[]> = {};
    filtered.forEach(log => {
      const dateStr = new Date(log.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });

    return Object.keys(groups).map(date => ({
      title: date,
      data: groups[date]
    }));
  }, [announcements, events, winners, themeColors, searchQuery, activeFilter, sortOrder]);

  if (isLoading) {
    return <LoadingState fullScreen message="Loading campus pulse..." />;
  }

  return (
    <Screen scrollable={false} extraPaddingBottom={0} dismissKeyboardOnTap={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" color={themeColors.text} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>Campus Pulse</Text>
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>Announcements, events & winners</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
          <IconSymbol name="search" color={themeColors.muted} size={16} />
          <TextInput
            placeholder="Search updates..."
            placeholderTextColor={themeColors.muted}
            style={[styles.searchInput, { color: themeColors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(["all", "notices", "events", "winners"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterChip,
                activeFilter === filter && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
              ]}
            >
              <Text style={[
                styles.filterChipText, 
                { color: activeFilter === filter ? themeColors.white : themeColors.muted }
              ]}>
                {filter === "all" ? "All" : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity 
          onPress={() => setSortOrder(prev => prev === "newest" ? "oldest" : "newest")}
          style={[styles.sortButton, { backgroundColor: themeColors.surfaceAlt }]}
        >
          <IconSymbol 
            name={sortOrder === "newest" ? "arrow-down" : "arrow-up"} 
            color={themeColors.text} 
            size={16} 
          />
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={themeColors.primary} />
        }
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
             <View style={[styles.sectionDot, { backgroundColor: themeColors.primary }]} />
             <Text style={[styles.sectionTitle, { color: themeColors.muted }]}>{title}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const handlePress = () => {
            setSelectedLog(item);
          };

          return (
            <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
              <Panel style={styles.logCard}>
                <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                  <IconSymbol name={item.icon} color={themeColors.text} size={18} />
                </View>
                <View style={styles.logText}>
                  <Text style={[styles.logTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.logSubtitle, { color: themeColors.muted }]} numberOfLines={1}>
                    {item.subtitle} • {item.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </Panel>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="search" color={themeColors.muted} size={48} />
            <Text style={[styles.emptyText, { color: themeColors.muted }]}>
              {searchQuery ? "No matches for your search" : "No recent campus activity"}
            </Text>
          </View>
        }
      />
      
      <LogDetailModal 
        visible={!!selectedLog} 
        logItem={selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 22,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontFamily: typography.medium,
    fontSize: 12,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -spacing.xs,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: -2,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    marginBottom: 6,
    borderRadius: 16,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logText: {
    flex: 1,
  },
  logTitle: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    marginBottom: 1,
  },
  logSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
});
