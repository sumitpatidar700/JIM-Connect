import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColors } from '@/src/utils/settings-effects';
import { colors, radii, spacing, typography, shadows } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/auth-store';
import { useEventSearchQuery } from '@/src/hooks/queries/useEventSearchQuery';
import { useAnnouncementsQuery } from '@/src/hooks/queries/useAnnouncementsQuery';
import { useUsersQuery } from '@/src/hooks/queries/useUsersQuery';
import { formatEventDate } from '@/src/utils/format';

export function GlobalSearchAutocomplete() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === "admin";
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const { data: events = [] } = useEventSearchQuery(searchQuery);
  const { data: announcements = [] } = useAnnouncementsQuery();
  const { data: users = [] } = useUsersQuery();

  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return announcements.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
    );
  }, [announcements, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim() || !isAdmin) return [];
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
    );
  }, [users, searchQuery, isAdmin]);

  const hasResults =
    events.length > 0 ||
    filteredAnnouncements.length > 0 ||
    filteredUsers.length > 0;

  const showDropdown = isFocused && searchQuery.length > 0;

  return (
    <View style={[styles.container, { zIndex: showDropdown ? 100 : 1 }]}>
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: themeColors.surface,
            borderColor: isFocused ? themeColors.primary : themeColors.border,
          },
        ]}
      >
        <IconSymbol
          color={isFocused ? themeColors.primary : themeColors.muted}
          name="search-outline"
          size={18}
        />
        <TextInput
          placeholder={isAdmin ? "Search students, events, notices..." : "Search events, notices..."}
          placeholderTextColor={themeColors.muted}
          style={[styles.searchInput, { color: themeColors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol color={themeColors.muted} name="close.circle.fill" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: themeColors.background,
              borderColor: themeColors.border,
              ...Platform.select<any>({
                ios: shadows.card,
                android: { elevation: 5 },
              }),
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
            {!hasResults ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: themeColors.muted }]}>
                  No results found for &quot;{searchQuery}&quot;
                </Text>
              </View>
            ) : (
              <View style={styles.resultsWrapper}>
                {filteredAnnouncements.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
                      Announcements
                    </Text>
                    {filteredAnnouncements.slice(0, 3).map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.resultItem, { borderBottomColor: themeColors.border }]}
                        onPress={() => {
                          setSearchQuery("");
                          router.push(isAdmin ? "/(app)/(tabs)/admin-announcements" : "/(app)/notices");
                        }}
                      >
                        <Text style={[styles.resultTitle, { color: themeColors.text }]}>{a.title}</Text>
                        <Text style={[styles.resultSubtitle, { color: themeColors.muted }]} numberOfLines={1}>
                          {a.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {events.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
                      Events
                    </Text>
                    {events.slice(0, 3).map((e) => (
                      <TouchableOpacity
                        key={e.id}
                        style={[styles.resultItem, { borderBottomColor: themeColors.border }]}
                        onPress={() => {
                          setSearchQuery("");
                          router.push(isAdmin ? "/(app)/(tabs)/admin-events" : "/(app)/(tabs)/events");
                        }}
                      >
                        <Text style={[styles.resultTitle, { color: themeColors.text }]}>{e.title}</Text>
                        <Text style={[styles.resultSubtitle, { color: themeColors.muted }]} numberOfLines={1}>
                          {formatEventDate(e.date)} • {e.venue}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {isAdmin && filteredUsers.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
                      Students
                    </Text>
                    {filteredUsers.slice(0, 3).map((u) => (
                      <TouchableOpacity
                        key={u.id}
                        style={[styles.resultItem, { borderBottomColor: themeColors.border }]}
                        onPress={() => {
                          setSearchQuery("");
                          router.push(`/(app)/student-detail?userId=${u.id}`);
                        }}
                      >
                        <Text style={[styles.resultTitle, { color: themeColors.text }]}>{u.name}</Text>
                        <Text style={[styles.resultSubtitle, { color: themeColors.muted }]} numberOfLines={1}>
                          {u.email}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: radii.round,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 15,
    height: "100%",
  },
  dropdown: {
    position: "absolute",
    top: 54, // below search bar
    left: 0,
    right: 0,
    maxHeight: 320,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 100,
  },
  scrollArea: {
    flexGrow: 0,
  },
  resultsWrapper: {
    paddingBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: typography.medium,
    fontSize: 14,
  },
  section: {
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 11,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultTitle: {
    fontFamily: typography.semiBold,
    fontSize: 14,
    marginBottom: 2,
  },
  resultSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
  },
});
