import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Panel } from '@/components/ui/Panel';
import { Screen } from '@/components/ui/Screen';
import { useEventByIdQuery } from '@/src/hooks/queries/useEventByIdQuery';
import { useEventRegistrationsQuery } from '@/src/hooks/queries/useEventRegistrationsQuery';
import { useAppFeedback } from '@/src/providers/app-feedback-provider';
import { colors, radii, spacing, typography } from '@/src/theme/tokens';
import { EventRegistrationWithUser } from '@/src/types/app';
import { formatEventDate } from '@/src/utils/format';
import { useThemeColors } from '@/src/utils/settings-effects';

type RegistrationSort = 'newest' | 'oldest' | 'az';

const sortOptions: { label: string; value: RegistrationSort }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'A-Z', value: 'az' },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getRegistrationPhone(registration: EventRegistrationWithUser) {
  return registration.phone ?? registration.users?.phone ?? '';
}

export default function EventRegistrationsScreen() {
  const { showAlert } = useAppFeedback();
  const themeColors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = id ?? '';
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [registrationSort, setRegistrationSort] = useState<RegistrationSort>('newest');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'groups' | 'list'>('groups');
  const { data: event = null, isLoading: eventLoading } = useEventByIdQuery(eventId);
  const { data: registrations = [], isLoading: registrationsLoading } =
    useEventRegistrationsQuery(eventId);

  const isTeamEvent = (event?.max_team_size ?? 1) > 1;

  const visibleRegistrations = useMemo(() => {
    const query = registrationSearch.trim().toLowerCase();

    return registrations
      .filter((registration) => {
        const phone = getRegistrationPhone(registration);

        if (!query) {
          return true;
        }

        return [
          registration.users?.name,
          registration.users?.email,
          phone,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      })
      .sort((a, b) => {
        if (registrationSort === 'az') {
          const first = a.users?.name ?? a.users?.email ?? 'Student';
          const second = b.users?.name ?? b.users?.email ?? 'Student';
          return first.localeCompare(second);
        }

        const first = new Date(a.created_at).getTime();
        const second = new Date(b.created_at).getTime();
        return registrationSort === 'newest' ? second - first : first - second;
      });
  }, [registrationSearch, registrationSort, registrations]);

  const groupsMap = useMemo(() => {
    const map: Record<string, { teamName: string; leaderId?: string; imageUrl?: string | null; registrations: typeof registrations }> = {};
    visibleRegistrations.forEach(r => {
      const tName = r.event_teams?.name || 'Individual / Unassigned';
      if (!map[tName]) {
        map[tName] = { teamName: tName, leaderId: r.event_teams?.leader_id, imageUrl: r.event_teams?.image_url, registrations: [] };
      }
      map[tName].registrations.push(r);
    });
    return Object.values(map).sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [visibleRegistrations]);

  const cycleRegistrationSort = useCallback(() => {
    setRegistrationSort((currentSort) => {
      const currentIndex = sortOptions.findIndex((option) => option.value === currentSort);
      return sortOptions[(currentIndex + 1) % sortOptions.length].value;
    });
  }, []);

  const activeSortLabel =
    sortOptions.find((option) => option.value === registrationSort)?.label ?? 'Newest';

  const exportText = useMemo(() => {
    if (!event) {
      return '';
    }

    const rows = [
      `Event: ${event.title}`,
      `Date: ${formatEventDate(event.date)}`,
      `Venue: ${event.venue}`,
      `Total registrations: ${registrations.length}`,
      '',
      'Name,Email,Phone,Registration Date/Time',
      ...registrations.map((registration) =>
        [
          registration.users?.name ?? 'Student',
          registration.users?.email ?? '',
          getRegistrationPhone(registration),
          formatEventDate(registration.created_at),
        ].join(','),
      ),
    ];

    return rows.join('\n');
  }, [event, registrations]);

  const copyAll = useCallback(async () => {
    if (!exportText) {
      return;
    }

    await Clipboard.setStringAsync(exportText);
    await showAlert({
      message: 'Copied all registrations to clipboard.',
      title: 'Copied',
      tone: 'success',
    });
  }, [exportText, showAlert]);

  const exportAll = useCallback(async () => {
    if (!exportText) {
      return;
    }

    await Share.share({
      message: exportText,
      title: `${event?.title ?? 'Registrations'} registrations`,
    });
  }, [event?.title, exportText]);

  if (eventLoading || registrationsLoading) {
    return <LoadingState fullScreen message="Loading registrations..." />;
  }

  if (!event) {
    return (
      <Screen>
        <BackButton fallbackHref="/(app)/(tabs)/admin-events" iconOnly plain />
        <EmptyState message="This event could not be found." title="Missing event" />
      </Screen>
    );
  }

  const totalAccepted = registrations.filter(r => (r.status ?? 'accepted') === 'accepted').length;
  const totalPending = registrations.filter(r => r.status === 'pending').length;
  const uniqueTeamsCount = new Set(registrations.map(r => r.event_teams?.name).filter(Boolean)).size;

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <BackButton fallbackHref="/(app)/(tabs)/admin-events" iconOnly plain />
          <View style={styles.titleWrap}>
            <Text
              numberOfLines={2}
              style={[styles.title, { color: themeColors.text }]}
            >
              {event.title}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              accessibilityLabel="Copy all registrations"
              accessibilityRole="button"
              onPress={() => void copyAll()}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol color={themeColors.text} name="copy-outline" size={20} />
            </Pressable>
            <Pressable
              accessibilityLabel="Export registrations"
              accessibilityRole="button"
              onPress={() => void exportAll()}
              style={({ pressed }) => [
                styles.headerActionButton,
                pressed && styles.pressed,
              ]}
            >
              <IconSymbol color={themeColors.text} name="share-outline" size={20} />
            </Pressable>
          </View>
        </View>
        <View style={styles.headerDetails}>
          <View style={styles.metaRow}>
            <IconSymbol color={themeColors.muted} name="calendar-outline" size={14} />
            <Text style={[styles.meta, { color: themeColors.muted }]}>{formatEventDate(event.date)}</Text>
          </View>
          <View style={styles.metaRow}>
            <IconSymbol color={themeColors.muted} name="location-outline" size={14} />
            <Text numberOfLines={1} style={[styles.meta, { color: themeColors.muted }]}>{event.venue}</Text>
          </View>
          <View style={styles.metaRow}>
            <IconSymbol color={themeColors.primary} name="people-outline" size={14} />
            <Text style={[styles.summary, { color: themeColors.primary }]}>
              {totalAccepted} accepted • {totalPending} pending requests {uniqueTeamsCount > 0 ? `• ${uniqueTeamsCount} groups` : ''}
            </Text>
          </View>
        </View>
      </View>

      {isTeamEvent ? (
        <View style={{ flexDirection: "row", backgroundColor: themeColors.border, padding: 4, borderRadius: radii.lg, marginBottom: spacing.md }}>
          <Pressable
            onPress={() => setViewMode('groups')}
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radii.md, backgroundColor: viewMode === 'groups' ? themeColors.primary : 'transparent' }}
          >
            <Text style={{ fontFamily: typography.semiBold, fontSize: 14, color: viewMode === 'groups' ? colors.white : themeColors.text }}>Group View ({groupsMap.length})</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('list')}
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: radii.md, backgroundColor: viewMode === 'list' ? themeColors.primary : 'transparent' }}
          >
            <Text style={{ fontFamily: typography.semiBold, fontSize: 14, color: viewMode === 'list' ? colors.white : themeColors.text }}>All Students ({visibleRegistrations.length})</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchRow}>
        <View style={styles.searchInput}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search name, email, or phone"
            placeholderTextColor={themeColors.muted}
            style={[
              styles.searchTextInput,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            value={registrationSearch}
            onChangeText={setRegistrationSearch}
          />
        </View>
        <Pressable
          accessibilityLabel={`Sort registrations. Current sort: ${activeSortLabel}`}
          accessibilityRole="button"
          onPress={cycleRegistrationSort}
          style={({ pressed }) => [
            styles.sortButton,
            pressed && styles.pressed,
          ]}
        >
          <IconSymbol color={themeColors.text} name="swap-vertical" size={20} />
        </Pressable>
      </View>

      {registrations.length === 0 ? (
        <EmptyState
          message="No students have registered for this event yet."
          title="No registrations"
        />
      ) : visibleRegistrations.length === 0 ? (
        <EmptyState
          message="Try a different search."
          title="No matching students"
        />
      ) : isTeamEvent && viewMode === 'groups' ? (
        <View style={{ gap: spacing.md }}>
          {groupsMap.map((g) => {
            const isExpanded = selectedGroup === g.teamName;
            const leader = g.registrations.find(r => r.user_id === g.leaderId)?.users;
            const accCount = g.registrations.filter(r => (r.status ?? 'accepted') === 'accepted').length;
            const pendCount = g.registrations.filter(r => r.status === 'pending').length;

            return (
              <Panel key={g.teamName} style={{ borderColor: isExpanded ? themeColors.primary : themeColors.border, borderWidth: 1 }}>
                <Pressable onPress={() => setSelectedGroup(isExpanded ? null : g.teamName)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
                    {g.imageUrl ? (
                      <Image source={{ uri: g.imageUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                    ) : (
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                        <IconSymbol name="people-outline" size={22} color={themeColors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: typography.bold, fontSize: 17, color: themeColors.text }}>{g.teamName}</Text>
                      <Text style={{ fontFamily: typography.medium, fontSize: 13, color: themeColors.muted, marginTop: 2 }}>
                        {g.registrations.length} total members ({accCount} Accepted, {pendCount} Pending)
                      </Text>
                      {leader ? (
                        <Text style={{ fontFamily: typography.regular, fontSize: 13, color: themeColors.primary, marginTop: 2 }}>
                          Leader: {leader.name}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {g.registrations.slice(0, 3).map((reg, idx) => {
                        const name = reg.users?.name ?? 'Student';
                        const avatarUrl = reg.users?.avatar_url;
                        return (
                          <View
                            key={reg.id}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              borderWidth: 1.5,
                              borderColor: themeColors.surface,
                              backgroundColor: themeColors.primarySoft,
                              alignItems: "center",
                              justifyContent: "center",
                              marginLeft: idx > 0 ? -12 : 0,
                              zIndex: 10 - idx,
                              overflow: "hidden",
                            }}
                          >
                            {avatarUrl ? (
                              <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} />
                            ) : (
                              <Text style={{ fontSize: 10, fontFamily: typography.semiBold, color: themeColors.primary }}>
                                {name.charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                      {g.registrations.length > 3 && (
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: themeColors.surface,
                            backgroundColor: themeColors.surfaceAlt,
                            alignItems: "center",
                            justifyContent: "center",
                            marginLeft: -12,
                            zIndex: 7,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontFamily: typography.bold, color: themeColors.text }}>
                            +{g.registrations.length - 3}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ backgroundColor: themeColors.primarySoft, padding: 8, borderRadius: radii.round, marginLeft: 4 }}>
                      <IconSymbol name={isExpanded ? "arrow-up" : "arrow-down"} size={20} color={themeColors.primary} />
                    </View>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopColor: themeColors.border, borderTopWidth: 1, gap: 12 }}>
                    {g.registrations.map(r => {
                      const name = r.users?.name ?? 'Student';
                      const phone = getRegistrationPhone(r);
                      const isLd = r.user_id === g.leaderId;
                      const st = r.status ?? 'accepted';
                      const avatarUrl = r.users?.avatar_url;

                      return (
                        <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomColor: themeColors.border, borderBottomWidth: 1 }}>
                          {avatarUrl ? (
                            <Image contentFit="cover" source={{ uri: avatarUrl }} style={styles.avatarSmall} />
                          ) : (
                            <View style={[styles.avatarFallbackSmall, { backgroundColor: themeColors.primarySoft }]}>
                              <Text style={[styles.avatarFallbackTextSmall, { color: themeColors.primary }]}>{getInitials(name)}</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontFamily: typography.semiBold, fontSize: 15, color: themeColors.text }}>{name}</Text>
                              {isLd ? <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}><Text style={{ color: colors.white, fontSize: 10, fontFamily: typography.semiBold }}>Leader</Text></View> : null}
                            </View>
                            <Text style={{ fontFamily: typography.regular, fontSize: 13, color: themeColors.muted }}>{r.users?.email}</Text>
                            <Text style={{ fontFamily: typography.regular, fontSize: 12, color: themeColors.muted }}>Phone: {phone || 'N/A'}</Text>
                          </View>
                          <View style={{ backgroundColor: st === 'accepted' ? '#10B98120' : '#F59E0B20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 12, color: st === 'accepted' ? '#10B981' : '#F59E0B', fontFamily: typography.semiBold, textTransform: 'capitalize' }}>{st}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </Panel>
            );
          })}
        </View>
      ) : (
        <View style={styles.registrationList}>
          {visibleRegistrations.map((registration, index) => {
            const name = registration.users?.name ?? 'Student';
            const avatarUrl = registration.users?.avatar_url;
            const phone = getRegistrationPhone(registration);
            const teamName = registration.event_teams?.name;
            const isLeader = registration.event_teams?.leader_id === registration.user_id;
            const status = registration.status ?? 'accepted';

            return (
              <Panel
                key={registration.id}
                style={[
                  styles.rowCard,
                  index === 0 && styles.rowCardFirst,
                  index === visibleRegistrations.length - 1 && styles.rowCardLast,
                  index > 0 && styles.rowCardJoined,
                ]}
              >
                <View style={styles.rowTop}>
                  {avatarUrl ? (
                    <Image contentFit="cover" source={{ uri: avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View
                      style={[
                        styles.avatarFallback,
                        { backgroundColor: themeColors.primarySoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarFallbackText,
                          { color: themeColors.primary },
                        ]}
                      >
                        {getInitials(name)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.rowText}>
                    <Text style={[styles.name, { color: themeColors.text }]}>{name}</Text>
                    <Text style={[styles.email, { color: themeColors.muted }]}>{registration.users?.email}</Text>
                    <Text style={[styles.phone, { color: themeColors.muted }]}>
                      Phone: {phone || 'Not provided'}
                    </Text>
                    {teamName ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: "#3B82F620", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>
                          {isLeader ? <IconSymbol name="star.fill" size={12} color="#3B82F6" /> : <IconSymbol name="people-outline" size={12} color="#3B82F6" />}
                          <Text style={{ fontSize: 11, color: "#3B82F6", fontFamily: typography.semiBold }}>Group: {teamName}</Text>
                        </View>
                        <View style={{ backgroundColor: status === "accepted" ? "#10B98120" : "#F59E0B20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                          <Text style={{ fontSize: 11, color: status === "accepted" ? "#10B981" : "#F59E0B", fontFamily: typography.semiBold, textTransform: "capitalize" }}>{status}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.time, { color: themeColors.primary }]}>{formatEventDate(registration.created_at)}</Text>
                </View>
              </Panel>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarFallbackText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  avatarSmall: {
    borderRadius: 20,
    height: 40,
    width: 40,
  },
  avatarFallbackSmall: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarFallbackTextSmall: {
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  email: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerDetails: {
    gap: 5,
    marginLeft: 38,
    marginTop: 2,
  },
  headerActionButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  headerTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  titleWrap: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingRight: spacing.sm,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  name: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 15,
  },
  phone: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
  },
  registrationList: {
    gap: 0,
    overflow: 'hidden',
  },
  rowCard: {
    borderRadius: 0,
    elevation: 0,
    marginBottom: 0,
    shadowOpacity: 0,
  },
  rowCardFirst: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  rowCardJoined: {
    marginTop: -1,
  },
  rowCardLast: {
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  rowText: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  rowTop: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  searchInput: {
    flex: 1,
  },
  searchRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sortButton: {
    alignItems: 'center',
    borderRadius: radii.round,
    height: 52,
    justifyContent: 'center',
    marginBottom: 0,
    width: 52,
  },
  searchTextInput: {
    borderRadius: radii.lg,
    borderWidth: 1,
    fontFamily: typography.regular,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  summary: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  time: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 12,
    textAlign: 'right',
    width: 88,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 20,
    lineHeight: 25,
  },
});
