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
import { useRecentRegistrationsQuery } from "@/src/hooks/queries/useRecentRegistrationsQuery";
import { useUsersQuery } from "@/src/hooks/queries/useUsersQuery";
import { formatEventDate } from "@/src/utils/format";
import { useThemeColors } from "@/src/utils/settings-effects";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";

type LogItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof IconSymbol>["name"];
  color: string;
  date: Date;
  type: 'announcement' | 'registration' | 'user';
  rawItem?: any;
};

export default function AdminLogsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "students" | "events" | "notices">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const { data: announcements = [], isLoading: al, refetch: ar } = useAnnouncementsQuery();
  const { data: events = [], isLoading: el, refetch: er } = useEventSearchQuery("");
  const { data: registrations = [], isLoading: rl, refetch: rr } = useRecentRegistrationsQuery(50);
  const { data: users = [], isLoading: ul, refetch: ur } = useUsersQuery();

  const isLoading = al || el || rl || ul;

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([ar(), er(), rr(), ur()]);
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const allLogs: LogItem[] = [];

    // Announcements
    announcements.forEach(a => {
      allLogs.push({
        id: `ann-${a.id}`,
        title: `Notice: ${a.title}`,
        subtitle: "System Broadcast",
        icon: "megaphone.fill",
        color: themeColors.accentBlue,
        date: new Date(a.created_at),
        type: 'announcement',
        rawItem: a
      });
    });

    // Registrations
    registrations.forEach(r => {
      allLogs.push({
        id: `reg-${r.id}`,
        title: `${r.users?.name || "Student"} joined event`,
        subtitle: r.events?.title || "Event Registration",
        icon: "checkmark",
        color: themeColors.primary,
        date: new Date(r.created_at),
        type: 'registration',
        rawItem: r
      });
    });

    // Users
    users.forEach(u => {
      allLogs.push({
        id: `usr-${u.id}`,
        title: `${u.name.split(' ')[0]} joined the community`,
        subtitle: u.email,
        icon: "person.badge.plus",
        color: themeColors.accentGreen,
        date: new Date(u.created_at),
        type: 'user',
        rawItem: u
      });
    });

    // Filter by Type
    const typeFiltered = allLogs.filter(log => {
      if (activeFilter === "all") return true;
      if (activeFilter === "students") return log.id.startsWith("usr-");
      if (activeFilter === "events") return log.id.startsWith("reg-");
      if (activeFilter === "notices") return log.id.startsWith("ann-");
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
  }, [announcements, registrations, users, themeColors, searchQuery, activeFilter, sortOrder]);

  if (isLoading) {
    return <LoadingState fullScreen message="Fetching activity history..." />;
  }

  return (
    <Screen scrollable={false} extraPaddingBottom={0} dismissKeyboardOnTap={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" color={themeColors.text} size={24} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: themeColors.text }]}>Activity Logs</Text>
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>Campus events & registrations</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
          <IconSymbol name="search" color={themeColors.muted} size={16} />
          <TextInput
            placeholder="Search activities, students..."
            placeholderTextColor={themeColors.muted}
            style={[styles.searchInput, { color: themeColors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(["all", "students", "events", "notices"] as const).map((filter) => (
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
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                  <IconSymbol name={item.icon} color={themeColors.text} size={20} />
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
              {searchQuery ? "No matches for your search" : "No activity logs yet"}
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
    paddingBottom: 0,
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
    width: 38,
    height: 38,
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
