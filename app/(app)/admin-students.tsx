import { 
  RefreshControl, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput,
  Image,
  Linking,
  ScrollView
} from "react-native";
import { useMemo, useState, useDeferredValue } from "react";
import { useRouter } from "expo-router";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { useUsersQuery } from "@/src/hooks/queries/useUsersQuery";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";

export default function AdminStudentsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { data: users = [], isLoading, refetch } = useUsersQuery(deferredSearchQuery);
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "newest">("az");

  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Sort
    result.sort((a, b) => {
      if (sortOrder === "az") return a.name.localeCompare(b.name);
      if (sortOrder === "za") return b.name.localeCompare(a.name);
      if (sortOrder === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return result;
  }, [users, sortOrder]);

  const handleCall = (phone?: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (isLoading) {
    return <LoadingState fullScreen message="Loading student database..." />;
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
            Student Directory
          </Text>
          <Text style={[styles.tagline, { color: themeColors.muted }]}>
            Managing {users.length} registered student profiles.
          </Text>
        </View>
      </View>

      <Panel style={styles.searchPanel}>
        <View style={[styles.searchBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <IconSymbol color={themeColors.muted} name="search" size={16} />
          <TextInput
            placeholder="Search by name, email or phone..."
            placeholderTextColor={themeColors.muted}
            style={[styles.searchInput, { color: themeColors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </Panel>

      <View style={styles.filterRow}>
        <Text style={{ fontSize: 13, fontFamily: typography.medium, color: themeColors.muted, flex: 1 }}>
          Showing {filteredUsers.length} student profiles
        </Text>
        <TouchableOpacity 
          onPress={() => {
            const orders: ("az" | "za" | "newest")[] = ["az", "za", "newest"];
            const next = orders[(orders.indexOf(sortOrder) + 1) % orders.length]!;
            setSortOrder(next);
          }}
          style={[styles.sortButton, { backgroundColor: themeColors.surfaceAlt }]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 }}>
            <IconSymbol 
              name={sortOrder === "az" ? "arrow-down" : sortOrder === "za" ? "arrow-up" : "clock"} 
              color={themeColors.text} 
              size={14} 
            />
            <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.text }}>
              {sortOrder === "az" ? "A-Z" : sortOrder === "za" ? "Z-A" : "Newest"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {filteredUsers.length === 0 ? (
        <EmptyState
          message={searchQuery ? "No students found matching your search." : "No students have registered yet."}
          title={searchQuery ? "No matches" : "Empty Directory"}
        />
      ) : (
        <View style={styles.listContainer}>
          {filteredUsers.map((user) => (
            <Panel key={user.id} style={styles.studentCard}>
              <View style={styles.cardMain}>
                <View style={[styles.avatarBox, { backgroundColor: themeColors.surfaceAlt }]}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                  ) : (
                    <Text style={[styles.avatarText, { color: themeColors.text }]}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: themeColors.text }]}>
                    {user.name}
                  </Text>
                  <Text style={[styles.studentEmail, { color: themeColors.muted }]}>
                    {user.email}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    {user.batch_name && (
                      <View style={{ backgroundColor: `${themeColors.primary}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, fontFamily: typography.semiBold, color: themeColors.primary }}>
                          {user.batch_name}
                        </Text>
                      </View>
                    )}
                    {user.phone && (
                      <View style={styles.phoneRow}>
                        <IconSymbol color={themeColors.muted} name="paperplane.fill" size={12} />
                        <Text style={[styles.studentPhone, { color: themeColors.muted }]}>
                          {user.phone}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  onPress={() => handleEmail(user.email)}
                  style={[styles.actionButton, { backgroundColor: themeColors.surfaceAlt }]}
                >
                  <IconSymbol color={themeColors.primary} name="paperplane.fill" size={14} />
                  <Text style={[styles.actionText, { color: themeColors.primary }]}>Email</Text>
                </TouchableOpacity>
                
                {user.phone && (
                  <TouchableOpacity 
                    onPress={() => handleCall(user.phone)}
                    style={[styles.actionButton, { backgroundColor: themeColors.surfaceAlt }]}
                  >
                    <IconSymbol color={themeColors.primary} name="checkmark" size={14} />
                    <Text style={[styles.actionText, { color: themeColors.primary }]}>Call</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/student-detail",
                      params: { userId: user.id },
                    })
                  }
                  style={[styles.actionButton, { backgroundColor: themeColors.surfaceAlt }]}
                >
                  <IconSymbol color={themeColors.text} name="chevron.right" size={14} />
                  <Text style={[styles.actionText, { color: themeColors.text }]}>View</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          ))}
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
    marginBottom: 0,
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
  tagline: {
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  searchPanel: {
    padding: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 0,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontFamily: typography.medium,
    fontSize: 12,
  },
  sortButton: {
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    gap: 12,
  },
  studentCard: {
    padding: spacing.sm,
    borderRadius: 16,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatarBox: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontFamily: typography.bold,
    fontSize: 20,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 16,
    marginBottom: 2,
  },
  studentEmail: {
    fontFamily: typography.regular,
    fontSize: 12,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  studentPhone: {
    fontFamily: typography.medium,
    fontSize: 12,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: spacing.sm,
    opacity: 0.5,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
});
