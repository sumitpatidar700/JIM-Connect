import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { useRef } from "react";
import {
    Linking,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    Modal,
    Share,
    PanResponder,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useEventSearchQuery } from "@/src/hooks/queries/useEventSearchQuery";
import { useRegisteredEventsQuery } from "@/src/hooks/queries/useRegisteredEventsQuery";
import { useRegistrationCountsQuery } from "@/src/hooks/queries/useRegistrationCountsQuery";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { eventService } from "@/src/services/event-service";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { useAuthStore } from "@/src/store/auth-store";
import { useBadgeStore } from "@/src/store/badge-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import {
    formatEventDate,
    formatRegistrationCountdown,
} from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { getRegistrationState } from "@/src/utils/registration-status";
import { useThemeColors } from "@/src/utils/settings-effects";
import { COMMITTEES_LIST, CLUBS_LIST } from "@/src/constants/event-tags";

type FilterMode = "all" | "registered";
type EventSort = "latest" | "upcoming" | "az";

const sortOptions: { label: string; value: EventSort }[] = [
  { label: "Latest added", value: "latest" },
  { label: "Upcoming", value: "upcoming" },
  { label: "A-Z", value: "az" },
];

export default function EventsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.profile?.id);
  const { isItemNewOnScreen, markItemAsSeen } = useBadgeStore();
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [eventSort, setEventSort] = useState<EventSort>("latest");
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useEventSearchQuery(query, { committees: selectedCommittees, clubs: selectedClubs });
  const {
    data: registrationRows = [],
    isLoading: registrationsLoading,
    refetch: refetchRegistrations,
  } = useRegisteredEventsQuery(userId);
  const eventIds = useMemo(() => events.map((event) => event.id), [events]);
  const queryClient = useQueryClient();
  const { showAlert } = useAppFeedback();
  const { data: registrationCounts = {}, refetch: refetchRegistrationCounts } =
    useRegistrationCountsQuery(eventIds);
  const { data: winners = [], refetch: refetchWinners } = useWinnersQuery();

  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ["pendingInvites", userId],
    queryFn: () => eventService.listPendingInvites(userId ?? ""),
    enabled: Boolean(userId),
  });

  const pendingRequests = useMemo(() => pendingInvites.filter(i => i.status === "pending"), [pendingInvites]);

  useFocusEffect(
    useCallback(() => {
      refetchEvents();
      refetchRegistrations();
      refetchRegistrationCounts();
      refetchWinners();
      if (userId) {
        refetchInvites();
      }
    }, [refetchEvents, refetchRegistrations, refetchRegistrationCounts, refetchWinners, refetchInvites, userId])
  );

  const [activePreviewModal, setActivePreviewModal] = useState<"image" | "pdf" | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleSaveImage = async (uri: string) => {
    try {
      if (Platform.OS === "web") {
        Linking.openURL(uri);
        return;
      }
      let localUri = uri;
      if (uri.startsWith("http")) {
        const filename = uri.split("/").pop() || "event_image.jpg";
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const { uri: downloadedUri } = await FileSystem.downloadAsync(uri, fileUri);
        localUri = downloadedUri;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(localUri);
        showAlert({ title: "Success", message: "Image saved to your camera roll successfully!", tone: "success" });
      } else {
        showAlert({ title: "Permission required", message: "Please allow photo library access to save images.", tone: "warning" });
      }
    } catch (e) {
      showAlert({ title: "Error", message: "Could not save image.", tone: "error" });
    }
  };

  const handleShareImage = async (uri: string) => {
    try {
      await Share.share({
        url: uri,
        message: `Check out this event image: ${uri}`,
        title: "Event Image",
      });
    } catch (e) {
      showAlert({ title: "Error", message: "Could not share image.", tone: "error" });
    }
  };

  const [previewScale, setPreviewScale] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const previewPanRef = useRef({ x: 0, y: 0 });
  const initialDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touches: any[]) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const previewPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistRef.current = getDistance(touches);
          initialScaleRef.current = previewScale;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (initialDistRef.current && initialDistRef.current > 0) {
            const currentDist = getDistance(touches);
            const multiplier = currentDist / initialDistRef.current;
            const newScale = Math.max(1, Math.min(5.0, initialScaleRef.current * multiplier));
            setPreviewScale(newScale);
          }
        } else if (touches.length === 1 && previewScale > 1) {
          setPreviewPan({
            x: previewPanRef.current.x + gestureState.dx,
            y: previewPanRef.current.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        previewPanRef.current = { x: previewPan.x, y: previewPan.y };
        initialDistRef.current = null;
        initialScaleRef.current = previewScale;
      },
      onPanResponderTerminate: () => {
        previewPanRef.current = { x: previewPan.x, y: previewPan.y };
        initialDistRef.current = null;
        initialScaleRef.current = previewScale;
      },
    })
  ).current;

  const resetPreviewZoom = () => {
    setPreviewScale(1);
    setPreviewPan({ x: 0, y: 0 });
    previewPanRef.current = { x: 0, y: 0 };
  };

  const handleInviteResponse = async (id: string, accept: boolean) => {
    try {
      await eventService.respondToTeamInvite(id, accept);
      await Promise.all([
        refetchInvites(),
        refetchRegistrations(),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
      ]);
      await showAlert({
        message: accept ? "You have successfully joined the group!" : "Invitation declined.",
        title: accept ? "Group Accepted" : "Declined",
        tone: accept ? "success" : "default",
      });
    } catch (error: any) {
      await showAlert({
        message: error?.message || "Could not respond to invite.",
        title: "Error",
        tone: "error",
      });
    }
  };

  const registeredEventIds = useMemo(
    () => registrationRows.map((registration) => registration.event_id),
    [registrationRows],
  );

  const winnersByEvent = useMemo(
    () =>
      winners.reduce<Record<string, typeof winners>>((groups, winner) => {
        groups[winner.event_id] = [...(groups[winner.event_id] ?? []), winner];
        return groups;
      }, {}),
    [winners],
  );

  const visibleEvents = useMemo(() => {
    let filtered =
      filterMode === "registered"
        ? events.filter((event) => registeredEventIds.includes(event.id))
        : events;

    return [...filtered].sort((a, b) => {
      if (eventSort === "az") {
        return a.title.localeCompare(b.title);
      }

      if (eventSort === "latest") {
        const first = new Date(a.created_at).getTime();
        const second = new Date(b.created_at).getTime();
        return second - first;
      }

      const firstDate = new Date(a.date).getTime();
      const secondDate = new Date(b.date).getTime();
      return firstDate - secondDate;
    });
  }, [filterMode, eventSort, events, registeredEventIds]);

  if (eventsLoading || registrationsLoading) {
    return <LoadingState fullScreen message={t("loadingEvents")} />;
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
            void Promise.all([
              refetchEvents(),
              userId ? refetchRegistrations() : Promise.resolve(),
              eventIds.length > 0
                ? refetchRegistrationCounts()
                : Promise.resolve(),
              refetchWinners(),
            ]).finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <Text style={[styles.title, { color: themeColors.text }]}>
        {t("discoverEvents")}
      </Text>
      <Text style={[styles.subtitle, { color: themeColors.muted }]}>
        {t("eventIntro")}
      </Text>

      {pendingRequests.length > 0 ? (
        <View style={{ marginBottom: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: typography.bold, fontSize: 18, color: themeColors.text }}>
              Pending Group Requests ({pendingRequests.length})
            </Text>
            <Pill label="Action Required" tone="warning" />
          </View>
          {pendingRequests.map((invite: any) => {
            const eventData = invite.event_teams?.events || invite.events;
            return (
              <Panel key={invite.id} style={{ borderColor: "#F59E0B50", borderWidth: 1.5 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontFamily: typography.bold, fontSize: 16, color: themeColors.text, marginBottom: 2 }}>
                      {eventData?.title || "Campus Event"}
                    </Text>
                    <Text style={{ fontFamily: typography.medium, fontSize: 12, color: themeColors.muted }}>
                      {eventData?.date ? formatEventDate(eventData.date) : ""} • {eventData?.venue || "JIM Indore"}
                    </Text>
                  </View>
                  <Pill label="Group Invite" tone="warning" />
                </View>

                <View style={{ backgroundColor: themeColors.surface, padding: 12, borderRadius: radii.md, marginBottom: 12, gap: 4 }}>
                  <Text style={{ fontFamily: typography.semiBold, fontSize: 14, color: themeColors.text }}>
                    Group Name: "{invite.event_teams?.name || 'Team'}"
                  </Text>
                  {invite.inviter ? (
                    <Text style={{ fontFamily: typography.regular, fontSize: 13, color: themeColors.muted }}>
                      Invited by: {invite.inviter.name || invite.inviter.email} ({invite.inviter.email})
                    </Text>
                  ) : null}
                </View>

                {invite.event_teams?.registrations && invite.event_teams.registrations.length > 0 ? (
                  <View style={{ marginBottom: 14, gap: 6 }}>
                    <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.muted }}>
                      Current Teammates ({invite.event_teams.registrations.length})
                    </Text>
                    {invite.event_teams.registrations.map((m: any) => {
                      const mName = m.users?.name || "Student";
                      const isLeader = m.user_id === invite.event_teams?.leader_id;
                      return (
                        <View key={m.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                          {m.users?.avatar_url ? (
                            <Image source={{ uri: m.users.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                          ) : (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                              <Text style={{ fontSize: 10, fontFamily: typography.semiBold, color: themeColors.primary }}>{mName.charAt(0).toUpperCase()}</Text>
                            </View>
                          )}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={{ fontSize: 13, fontFamily: typography.medium, color: themeColors.text }}>{mName}</Text>
                            {isLeader ? (
                              <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                                <Text style={{ color: "#fff", fontSize: 9, fontFamily: typography.semiBold }}>Leader</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <PrimaryButton
                    label="Accept & Join"
                    onPress={() => handleInviteResponse(invite.id, true)}
                    style={{ flex: 1, backgroundColor: "#10B981" }}
                  />
                  <PrimaryButton
                    label="Decline"
                    onPress={() => handleInviteResponse(invite.id, false)}
                    variant="secondary"
                    style={{ flex: 1 }}
                  />
                </View>
              </Panel>
            );
          })}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <TextField
            label=""
            placeholder={t("searchEvents")}
            value={query}
            onChangeText={setQuery}
            rightIcon={
              <IconSymbol color={themeColors.muted} name="search" size={16} />
            }
          />
        </View>
        <Pressable
          onPress={() => setShowSortOptions(prev => !prev)}
          style={{ height: 52, width: 52, borderRadius: radii.lg, backgroundColor: showSortOptions ? themeColors.primary : themeColors.surfaceAlt, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: showSortOptions ? themeColors.primary : themeColors.border }}
        >
          <Ionicons name="filter" size={20} color={showSortOptions ? "#FFFFFF" : themeColors.text} />
        </Pressable>
      </View>

      <View style={styles.filters}>
        <PrimaryButton
          label={t("allEvents")}
          onPress={() => setFilterMode("all")}
          variant={filterMode === "all" ? "primary" : "secondary"}
        />
        <PrimaryButton
          label={t("registered")}
          onPress={() => setFilterMode("registered")}
          variant={filterMode === "registered" ? "primary" : "secondary"}
        />
      </View>

      {showSortOptions ? (
        <View style={styles.sortSection}>
          <Text style={[styles.sortLabel, { color: themeColors.text }]}>
            {t("sort")}
          </Text>
          <View style={styles.chipRow}>
            {sortOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setEventSort(option.value)}
                style={[
                  styles.sortChip,
                  {
                    borderColor:
                      eventSort === option.value
                        ? themeColors.primary
                        : themeColors.border,
                    backgroundColor:
                      eventSort === option.value
                        ? themeColors.primary
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    {
                      color:
                        eventSort === option.value
                          ? themeColors.white
                          : themeColors.muted,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sortLabel, { color: themeColors.text, marginTop: 12 }]}>
            Filter by Committees
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {COMMITTEES_LIST.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedCommittees(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              >
                <Pill label={c} tone={selectedCommittees.includes(c) ? "brand" : "dark"} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.sortLabel, { color: themeColors.text, marginTop: 12 }]}>
            Filter by Clubs
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CLUBS_LIST.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedClubs(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
              >
                <Pill label={c} tone={selectedClubs.includes(c) ? "brand" : "dark"} />
              </Pressable>
            ))}
          </View>
          
          {(selectedCommittees.length > 0 || selectedClubs.length > 0) && (
            <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
              <Pressable onPress={() => { setSelectedCommittees([]); setSelectedClubs([]); }}>
                <Text style={{ color: themeColors.primary, fontFamily: typography.semiBold }}>Clear Filters</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      {visibleEvents.length === 0 ? (
        <EmptyState
          message={
            filterMode === "registered"
              ? t("noRegisteredEvents")
              : t("noEventsSearch")
          }
          title={t("noEventsFound")}
        />
      ) : (
        visibleEvents.map((event) => {
          const isRegistered = registeredEventIds.includes(event.id);
          const isNew = isItemNewOnScreen(event.id, event.created_at, "events");
          const registrationState = getRegistrationState(event, {
            closed: "#DC2626",
            open: "#16A34A",
          });
          const eventWinners = winnersByEvent[event.id] ?? [];
          return (
            <Panel
              key={event.id}
              style={[
                styles.eventCard,
                {
                  borderColor: registrationState.borderColor,
                  borderWidth: 1.5,
                },
              ]}
            >
              {event.image_url ? (
                <Pressable onPress={() => { setPreviewImageUrl(event.image_url!); setActivePreviewModal("image"); }}>
                  <Image
                    contentFit="cover"
                    source={{ uri: event.image_url }}
                    style={styles.eventImage}
                  />
                </Pressable>
              ) : null}
              <View style={styles.cardHeader}>
                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {event.title}
                  </Text>
                  <Text style={[styles.cardMeta, { color: themeColors.muted }]}>
                    {formatEventDate(event.date)} • {event.venue}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {isNew ? (
                    <Pill label="NEW" tone="danger" />
                  ) : null}
                  <Pill
                    label={
                      isRegistered
                        ? t("registered")
                        : registrationState.isOpen
                          ? "Open"
                          : "Closed"
                    }
                    tone={
                      isRegistered
                        ? "success"
                        : registrationState.isOpen
                          ? "brand"
                          : "default"
                    }
                  />
                </View>
              </View>
              <Text
                numberOfLines={2}
                style={[styles.cardDescription, { color: themeColors.muted }]}
              >
                {event.description}
              </Text>
              {eventWinners.length > 0 ? (
                <View
                  style={[
                    styles.winnerBox,
                    {
                      backgroundColor: themeColors.accentAmber + "20",
                      borderColor: themeColors.accentAmber + "50",
                    },
                  ]}
                >
                  <View style={styles.winnerHeader}>
                    <IconSymbol
                      color={themeColors.primary}
                      name="star.fill"
                      size={14}
                    />
                    <Text
                      style={[
                        styles.winnerLabel,
                        { color: themeColors.primary },
                      ]}
                    >
                      Winner{eventWinners.length === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Text
                    style={[styles.winnerNames, { color: themeColors.text }]}
                  >
                    {eventWinners
                      .map((winner) => `${winner.position}: ${winner.users?.name ?? winner.name}`)
                      .join("  |  ")}
                  </Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.registrationInfo,
                  { backgroundColor: themeColors.background },
                ]}
              >
                <View style={styles.infoBlock}>
                  <Text
                    style={[styles.infoLabel, { color: themeColors.muted }]}
                  >
                    {t("studentsRegistered")}
                  </Text>
                  <Text
                    style={[styles.infoValue, { color: themeColors.primary }]}
                  >
                    {registrationCounts[event.id] ?? 0}
                  </Text>
                </View>
                <View style={styles.infoBlock}>
                  <Text
                    style={[styles.infoLabel, { color: themeColors.muted }]}
                  >
                    {t("registration")}
                  </Text>
                  <Text
                    style={[
                      styles.infoValue,
                      {
                        color: event.registrations_paused
                          ? themeColors.text
                          : themeColors.primary,
                      },
                    ]}
                  >
                    {event.registrations_paused
                      ? "Paused"
                      : registrationState.isOpen
                        ? event.registration_until
                          ? formatRegistrationCountdown(
                              event.registration_until,
                            )
                          : "Closes at start"
                        : "Closed"}
                  </Text>
                </View>
              </View>
              {event.google_drive_link ? (
                <View style={{ marginBottom: spacing.sm }}>
                  <PrimaryButton
                    icon="images"
                    label="Photo Gallery"
                    onPress={() => void Linking.openURL(event.google_drive_link!)}
                    style={{ backgroundColor: "#4285F4" }}
                  />
                </View>
              ) : null}
              {event.links?.map((link, idx) => (
                <View key={`link-${idx}`} style={{ marginBottom: spacing.sm }}>
                  <PrimaryButton
                    icon="link"
                    label={link.title || "External Link"}
                    onPress={() => void Linking.openURL(link.url)}
                    style={{ backgroundColor: themeColors.primary }}
                  />
                </View>
              ))}
              {event.pdf_url ? (
                <View style={{ marginBottom: spacing.sm }}>
                  <PrimaryButton
                    icon="doc.fill"
                    label="View Attached PDF Document"
                    onPress={() => { setPreviewPdfUrl(event.pdf_url!); setActivePreviewModal("pdf"); }}
                    style={{ backgroundColor: themeColors.primary }}
                  />
                </View>
              ) : null}
              {event.max_registrations ? (
                <View style={{ marginBottom: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Math.max(0, event.max_registrations - (registrationCounts[event.id] ?? 0)) <= event.max_registrations * 0.25 ? "#EF4444" : themeColors.surfaceAlt, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.md, borderWidth: 1, borderColor: Math.max(0, event.max_registrations - (registrationCounts[event.id] ?? 0)) <= event.max_registrations * 0.25 ? "#FCA5A5" : themeColors.border }}>
                  <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: Math.max(0, event.max_registrations - (registrationCounts[event.id] ?? 0)) <= event.max_registrations * 0.25 ? "#FFFFFF" : themeColors.text }}>
                    {`Capacity: ${event.max_registrations} Seats`}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: typography.bold, color: Math.max(0, event.max_registrations - (registrationCounts[event.id] ?? 0)) <= event.max_registrations * 0.25 ? "#FFFFFF" : themeColors.primary }}>
                    {`${Math.max(0, event.max_registrations - (registrationCounts[event.id] ?? 0))} Seats Left`}
                  </Text>
                </View>
              ) : null}
              <PrimaryButton
                icon="eye.fill"
                label={t("eventDetails")}
                onPress={() => {
                  markItemAsSeen(event.id);
                  router.push({
                    pathname: "/(app)/events/[id]",
                    params: { id: event.id },
                  });
                }}
                variant="ghost"
              />
            </Panel>
          );
        })
      )}

      <Modal
        visible={activePreviewModal === "image"}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { setActivePreviewModal(null); setPreviewImageUrl(null); resetPreviewZoom(); }}
      >
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
            <Pressable onPress={() => { setActivePreviewModal(null); setPreviewImageUrl(null); resetPreviewZoom(); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
            </Pressable>
            <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Image Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" }} {...previewPanResponder.panHandlers}>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                contentFit="contain"
                style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", transform: [{ scale: previewScale }, { translateX: previewPan.x }, { translateY: previewPan.y }] }}
              />
            ) : null}
          </View>
          <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 24), alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, gap: 16, borderWidth: 1, borderColor: themeColors.border, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
            <Pressable onPress={() => setPreviewScale((s) => Math.min(s + 0.5, 4.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add" size={22} color={themeColors.primary} />
            </Pressable>
            <Pressable onPress={() => setPreviewScale((s) => Math.max(s - 0.5, 1.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="remove" size={22} color={themeColors.primary} />
            </Pressable>
            <View style={{ width: 1, height: 24, backgroundColor: themeColors.border }} />
            <Pressable onPress={() => void handleSaveImage(previewImageUrl!)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="download" size={20} color={themeColors.primary} />
            </Pressable>
            <Pressable onPress={() => void handleShareImage(previewImageUrl!)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="share-social" size={20} color={themeColors.primary} />
            </Pressable>
          </View>
          {previewScale > 1 ? (
            <Pressable onPress={resetPreviewZoom} style={{ position: "absolute", top: Math.max(insets.top, 20) + 70, alignSelf: "center", backgroundColor: themeColors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, zIndex: 20 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: typography.bold }}>Reset Zoom ({previewScale.toFixed(1)}x)</Text>
            </Pressable>
          ) : null}
        </View>
      </Modal>

      <Modal
        visible={activePreviewModal === "pdf"}
        animationType="fade"
        transparent={true}
        onRequestClose={() => { setActivePreviewModal(null); setPreviewPdfUrl(null); }}
      >
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <Pressable onPress={() => { setActivePreviewModal(null); setPreviewPdfUrl(null); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
            </Pressable>
            <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Attached Document</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: themeColors.surface, padding: 32, borderRadius: 24, alignItems: "center", width: "100%", maxWidth: 400, borderWidth: 1, borderColor: themeColors.border, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <Ionicons name="document-text" size={48} color={themeColors.primary} />
              </View>
              <Text style={{ color: themeColors.text, fontSize: 20, fontFamily: typography.bold, textAlign: "center", marginBottom: 8 }}>
                Attached PDF Document
              </Text>
              <Text style={{ color: themeColors.muted, fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
                This document is securely attached to the event. Tap below to view or download it directly.
              </Text>
              <PrimaryButton
                label="Open Document"
                icon="open"
                onPress={() => void Linking.openURL(previewPdfUrl!)}
                style={{ width: "100%", backgroundColor: themeColors.primary }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardDescription: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  cardMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  cardText: {
    flex: 1,
    marginRight: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
    marginBottom: 4,
  },
  countMeta: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 6,
  },
  statusMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginTop: 4,
  },
  registrationInfo: {
    backgroundColor: colors.background,
    borderRadius: 12,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  infoValue: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  infoPaused: {
    color: colors.text,
  },
  eventImage: {
    borderRadius: 16,
    height: 180,
    marginBottom: spacing.md,
    width: "100%",
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sortSection: {
    marginBottom: spacing.xs,
  },
  sortLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  sortChip: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    color: colors.muted,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  sortChipTextActive: {
    color: colors.white,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 0,
  },
  searchWrapper: {
    marginTop: -spacing.sm,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 24,
    marginBottom: 0,
  },
  winnerBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  winnerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  winnerLabel: {
    fontFamily: typography.semiBold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  winnerNames: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 20, // Align with icon text
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
