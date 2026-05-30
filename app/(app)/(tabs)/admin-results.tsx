import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { eventService } from "@/src/services/event-service";
import { repositoryService } from "@/src/services/repository-service";
import { winnerService } from "@/src/services/winner-service";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import {
    EventItem,
    EventRegistrationWithUser,
    RepositoryItem,
    WinnerItem,
} from "@/src/types/app";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";

type ResultEventFilter = "all" | "upcoming" | "past";
type ResultEventSort = "soonest" | "latest" | "az";
type DraftWinner = {
  email: string;
  name: string;
  position: string;
  registrationId: string;
  userId?: string;
};

const eventFilterOptions: { label: string; value: ResultEventFilter }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
];

const eventSortOptions: { label: string; value: ResultEventSort }[] = [
  { label: "Soonest", value: "soonest" },
  { label: "Latest", value: "latest" },
  { label: "A-Z", value: "az" },
];

export default function AdminResultsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useAppFeedback();
  const profile = useAuthStore((state) => state.profile);
  const activeSession = useAuthStore((state) => state.activeSession);
  const themeColors = useThemeColors();
  const { t } = useTranslation();

  const batches = useAuthStore((state) => state.batches);
  const adminSelectedBatch = useAuthStore((state) => state.adminSelectedBatch);
  const setAdminSelectedBatch = useAuthStore((state) => state.setAdminSelectedBatch);
  const fetchBatches = useAuthStore((state) => state.fetchBatches);

  useState(() => {
    fetchBatches();
  });

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventFilter, setEventFilter] = useState<ResultEventFilter>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [eventSort, setEventSort] = useState<ResultEventSort>("soonest");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<
    EventRegistrationWithUser[]
  >([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"declare" | "view">("declare");
  const [showAllTargetEvents, setShowAllTargetEvents] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [publishedSearch, setPublishedSearch] = useState("");
  const [publishedSort, setPublishedSort] = useState<"eventTitle" | "winnerCount">("eventTitle");
  const [showPublishedFilterMenu, setShowPublishedFilterMenu] = useState(false);
  const [editingWinner, setEditingWinner] = useState<{ id: string; name: string; position: string } | null>(null);
  const [activeMenuWinnerId, setActiveMenuWinnerId] = useState<string | null>(null);
  const [draftWinners, setDraftWinners] = useState<DraftWinner[]>([]);
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [repositoryItems, setRepositoryItems] = useState<RepositoryItem[]>([]);
  const [repositoryForm, setRepositoryForm] = useState({ description: "" });
  const [repositoryImageUri, setRepositoryImageUri] = useState("");
  const [loading, setLoading] = useState(true);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const winnersReady = useMemo(
    () =>
      Boolean(
        selectedEventId &&
          draftWinners.length > 0 &&
          draftWinners.every((winner) => winner.position.trim()),
      ),
    [draftWinners, selectedEventId],
  );
  const repositoryFormReady = useMemo(
    () => Boolean(selectedEventId && repositoryForm.description.trim()),
    [repositoryForm.description, selectedEventId],
  );
  const loadData = useCallback(async () => {
    const [eventRows, winnerRows, repositoryRows] = await Promise.all([
      eventService.searchEvents("", { batchId: adminSelectedBatch?.id ?? null }),
      winnerService.listWinners(adminSelectedBatch?.id ?? null),
      repositoryService.listRepositoryItems(),
    ]);
    const nextEventId = selectedEventId ?? eventRows[0]?.id ?? null;
    const registrationRows = nextEventId
      ? await eventService.listRegistrationsForEvent(nextEventId)
      : [];
    setEvents(eventRows);
    setWinners(winnerRows);
    setRepositoryItems(repositoryRows);
    setRegistrations(registrationRows);
    setSelectedEventId(nextEventId);
    setDraftWinners((current) =>
      current.filter((winner) =>
        registrationRows.some((row) => row.id === winner.registrationId),
      ),
    );
  }, [selectedEventId, adminSelectedBatch]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const canDeclareResults = selectedEvent
    ? new Date(selectedEvent.date).getTime() <= Date.now()
    : false;

  const visibleEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const now = Date.now();

    return events
      .filter((event) => {
        if (query) {
          const searchable = `${event.title} ${event.description} ${event.venue}`.toLowerCase();
          if (!searchable.includes(query)) {
            return false;
          }
        }

        if (eventFilter === "all") {
          return true;
        }

        const eventTime = new Date(event.date).getTime();
        return eventFilter === "upcoming" ? eventTime >= now : eventTime < now;
      })
      .sort((a, b) => {
        if (eventSort === "az") {
          return a.title.localeCompare(b.title);
        }

        const first = new Date(a.date).getTime();
        const second = new Date(b.date).getTime();
        return eventSort === "soonest" ? first - second : second - first;
      });
  }, [eventFilter, eventSearch, eventSort, events]);

  const selectedEventWinners = useMemo(
    () => winners.filter((winner) => winner.event_id === selectedEventId),
    [selectedEventId, winners],
  );
  const winnerSections = useMemo(() => {
    const sections = winners.reduce<
      Record<string, { eventTitle: string; meta: string; winners: WinnerItem[] }>
    >((groups, winner) => {
      const eventData = (winner as any).events || (winner as any).event;
      const eventTitle = eventData?.title ?? "Campus Event";
      const eventMeta = eventData
        ? `${formatEventDate(eventData.date)} • ${eventData.venue}`
        : "Event details unavailable";
      const existing = groups[winner.event_id] ?? {
        eventTitle,
        meta: eventMeta,
        winners: [],
      };

      return {
        ...groups,
        [winner.event_id]: {
          ...existing,
          winners: [...existing.winners, winner],
        },
      };
    }, {});

    return Object.entries(sections)
      .map(([eventId, section]) => ({ eventId, ...section }))
      .sort((a, b) => a.eventTitle.localeCompare(b.eventTitle));
  }, [winners]);

  const filteredWinnerSections = useMemo(() => {
    const query = publishedSearch.trim().toLowerCase();
    let result = winnerSections;

    if (query) {
      result = result.filter((section) => {
        const titleMatch = section.eventTitle.toLowerCase().includes(query);
        const metaMatch = section.meta.toLowerCase().includes(query);
        const winnerMatch = section.winners.some(w => w.name.toLowerCase().includes(query) || w.position.toLowerCase().includes(query));
        return titleMatch || metaMatch || winnerMatch;
      });
    }

    return [...result].sort((a, b) => {
      if (publishedSort === "winnerCount") {
        return b.winners.length - a.winners.length;
      }
      return a.eventTitle.localeCompare(b.eventTitle);
    });
  }, [winnerSections, publishedSearch, publishedSort]);

  const isTeamEvent = (selectedEvent?.max_team_size ?? 1) > 1;

  const registeredTeams = useMemo(() => {
    if (!selectedEvent || !isTeamEvent) {
      return [];
    }

    const teamsMap = new Map<string, {
      teamId: string;
      name: string;
      leaderId: string;
      members: { name: string; email: string; user_id: string }[];
    }>();

    const soloTeams: {
      teamId: string;
      name: string;
      leaderId: string;
      members: { name: string; email: string; user_id: string }[];
    }[] = [];

    registrations.forEach((reg) => {
      if (reg.team_id && reg.event_teams) {
        const existing = teamsMap.get(reg.team_id);
        const memberInfo = {
          name: reg.users?.name ?? "Student",
          email: reg.users?.email ?? "No email",
          user_id: reg.user_id,
        };
        if (existing) {
          existing.members.push(memberInfo);
        } else {
          teamsMap.set(reg.team_id, {
            teamId: reg.team_id,
            name: reg.event_teams.name,
            leaderId: reg.event_teams.leader_id,
            members: [memberInfo],
          });
        }
      } else {
        const memberInfo = {
          name: reg.users?.name ?? "Student",
          email: reg.users?.email ?? "No email",
          user_id: reg.user_id,
        };
        soloTeams.push({
          teamId: `solo-${reg.id}`,
          name: reg.users?.name ? `Team ${reg.users.name}` : "Solo Registrant",
          leaderId: reg.user_id,
          members: [memberInfo],
        });
      }
    });

    return [...Array.from(teamsMap.values()), ...soloTeams];
  }, [registrations, selectedEvent, isTeamEvent]);

  const filteredCandidateTeams = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    const draftedTeamIds = new Set(
      draftWinners.map((winner) => (winner as any).teamId).filter(Boolean)
    );
    const publishedWinnerNames = new Set(
      selectedEventWinners.map((w) => w.name.trim().toLowerCase())
    );

    return registeredTeams
      .filter((team) => !draftedTeamIds.has(team.teamId))
      .filter((team) => {
        const teamNameLower = team.name.trim().toLowerCase();
        
        // Since group winner names are stored as "Team Name (Member 1, Member 2)",
        // we check if any published winner starts with "team name (" or is an exact match.
        const alreadyPublished = selectedEventWinners.some(
          (w) => w.name.trim().toLowerCase().startsWith(`${teamNameLower} (`) || w.name.trim().toLowerCase() === teamNameLower
        );
        if (alreadyPublished) {
          return false;
        }

        if (!query) {
          return true;
        }

        const memberSearchStr = team.members.map(m => `${m.name} ${m.email}`).join(" ");
        const searchable = `${team.name} ${memberSearchStr}`.toLowerCase();
        return searchable.includes(query);
      });
  }, [candidateSearch, draftWinners, registeredTeams, selectedEventWinners]);

  const filteredCandidates = useMemo(() => {
    const query = candidateSearch.trim().toLowerCase();
    const draftedIds = new Set(draftWinners.map((winner) => winner.registrationId));
    const publishedWinnerNames = new Set(
      selectedEventWinners.map((w) => w.name.trim().toLowerCase())
    );

    return registrations
      .filter((registration) => !draftedIds.has(registration.id))
      .filter((registration) => {
        const candidateName = (registration.users?.name ?? registration.users?.email ?? "Student").trim().toLowerCase();
        if (publishedWinnerNames.has(candidateName)) {
          return false;
        }

        if (!query) {
          return true;
        }

        const searchable = `${registration.users?.name ?? ""} ${registration.users?.email ?? ""} ${registration.users?.phone ?? ""} ${registration.phone ?? ""}`.toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 20);
  }, [candidateSearch, draftWinners, registrations, selectedEventWinners]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          setLoading(true);
          await loadData();
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [loadData]),
  );

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
    return <LoadingState fullScreen message="Loading results studio..." />;
  }

  const chooseImage = async () => {
    const currentPermission =
      await ImagePicker.getMediaLibraryPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        const openSettings = await showConfirm({
          cancelLabel: "Not now",
          confirmLabel: "Open Settings",
          message:
            "Photo access is blocked for this app. Open device settings and allow media access to upload winner and archive images.",
          title: "Permission blocked",
          tone: "warning",
        });

        if (openSettings) {
          await Linking.openSettings();
        }
        return;
      }

      await showAlert({
        message: "Allow media access to upload images.",
        title: "Permission needed",
        tone: "warning",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0]?.uri ?? "";
      setRepositoryImageUri(uri);
    }
  };

  const selectEvent = async (eventId: string) => {
    setSelectedEventId(eventId);
    setCandidateSearch("");
    setDraftWinners([]);
    try {
      setRegistrationLoading(true);
      const rows = await eventService.listRegistrationsForEvent(eventId);
      setRegistrations(rows);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const addDraftWinner = (registration: EventRegistrationWithUser) => {
    if (draftWinners.some((winner) => winner.registrationId === registration.id)) {
      void showAlert({
        message: "This student is already selected as a winner.",
        title: "Duplicate Candidate",
        tone: "warning",
      });
      return;
    }

    const candidateName =
      registration.users?.name?.trim() ||
      registration.users?.email?.trim() ||
      "Student";

    setDraftWinners((current) => [
      ...current,
      {
        email: registration.users?.email ?? "",
        name: candidateName,
        position: `${current.length + 1}${getOrdinalSuffix(current.length + 1)} Place`,
        registrationId: registration.id,
        userId: registration.user_id,
      },
    ]);
  };

  const addDraftWinnerTeam = (team: typeof registeredTeams[number]) => {
    if (draftWinners.some((winner) => (winner as any).teamId === team.teamId)) {
      void showAlert({
        message: "This group is already selected as a winner.",
        title: "Duplicate Group",
        tone: "warning",
      });
      return;
    }

    const membersString = team.members.map(m => m.name).join(", ");
    const winnerName = `${team.name} (${membersString})`;

    setDraftWinners((current) => [
      ...current,
      {
        email: "",
        name: winnerName,
        position: `${current.length + 1}${getOrdinalSuffix(current.length + 1)} Place`,
        registrationId: team.teamId,
        userId: undefined,
        teamId: team.teamId,
      } as any,
    ]);
  };

  const updateDraftWinnerPosition = (registrationId: string, position: string) => {
    setDraftWinners((current) =>
      current.map((winner) =>
        winner.registrationId === registrationId ? { ...winner, position } : winner,
      ),
    );
  };

  const removeDraftWinner = (registrationId: string) => {
    setDraftWinners((current) =>
      current.filter((winner) => winner.registrationId !== registrationId),
    );
  };

  const publishWinners = async () => {
    if (!activeSession) {
      await showAlert({
        message: "You cannot publish results without an active academic session. Please set one in Settings first.",
        title: "Publishing disabled",
        tone: "warning",
      });
      return;
    }

    if (!selectedEventId || !winnersReady) {
      await showAlert({
        message: "Choose an event, add one or more registered candidates, and fill every position.",
        title: "Missing fields",
        tone: "warning",
      });
      return;
    }

    if (!canDeclareResults) {
      await showAlert({
        message: "Results can be declared only after the event date and time.",
        title: "Event not completed",
        tone: "warning",
      });
      return;
    }

    const emails = draftWinners.map(w => w.email.trim().toLowerCase()).filter(Boolean);
    const uniqueEmails = new Set(emails);
    if (emails.length !== uniqueEmails.size) {
      await showAlert({
        message: "A single student cannot be selected for multiple winning positions.",
        title: "Duplicate Winner Entry",
        tone: "warning",
      });
      return;
    }

    const teamIds = draftWinners.map(w => (w as any).teamId).filter(Boolean);
    const uniqueTeamIds = new Set(teamIds);
    if (teamIds.length !== uniqueTeamIds.size) {
      await showAlert({
        message: "A single team/group cannot be selected for multiple winning positions.",
        title: "Duplicate Group Entry",
        tone: "warning",
      });
      return;
    }

    const positions = draftWinners.map(w => w.position.trim().toLowerCase());
    const uniquePositions = new Set(positions);
    if (positions.length !== uniquePositions.size) {
      await showAlert({
        message: "Multiple students cannot be assigned to the exact same position (e.g. two 1st Places).",
        title: "Duplicate Position",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      await Promise.all(
        draftWinners.map((winner) =>
          winnerService.createWinner({
            event_id: selectedEventId,
            name: winner.name,
            position: winner.position,
            user_id: winner.userId,
            batchId: adminSelectedBatch?.id ?? null,
          }),
        ),
      );
      setDraftWinners([]);
      setCandidateSearch("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.winners(adminSelectedBatch?.id ?? null) });
      await loadData();
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to publish winner",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const publishRepositoryItem = async () => {
    if (!activeSession) {
      await showAlert({
        message: "You cannot add archive items without an active academic session. Please set one in Settings first.",
        title: "Publishing disabled",
        tone: "warning",
      });
      return;
    }

    if (!selectedEventId || !repositoryForm.description) {
      await showAlert({
        message: "Choose an event and add archive text.",
        title: "Missing fields",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      await repositoryService.createRepositoryItem({
        description: repositoryForm.description,
        event_id: selectedEventId,
        imageUri: repositoryImageUri,
      });
      setRepositoryForm({ description: "" });
      setRepositoryImageUri("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.repository });
      await loadData();
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to add archive item",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditWinner = (winner: WinnerItem) => {
    setEditingWinner({ id: winner.id, name: winner.users?.name ?? winner.name, position: winner.position });
  };

  const handleSaveWinnerEdit = async () => {
    if (!editingWinner || !editingWinner.name.trim() || !editingWinner.position.trim()) return;
    try {
      setSubmitting(true);
      await winnerService.updateWinner(editingWinner.id, {
        name: editingWinner.name,
        position: editingWinner.position,
      });
      setEditingWinner(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.winners(adminSelectedBatch?.id ?? null) });
      await loadData();
      await showAlert({
        message: "Winner successfully updated.",
        title: "Updated",
        tone: "success",
      });
    } catch (e: any) {
      await showAlert({
        message: e?.message || "Could not update winner.",
        title: "Error",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWinner = async (winnerId: string) => {
    const confirmed = await showConfirm({
      confirmLabel: "Delete",
      message: "Are you sure you want to remove this winner entry?",
      title: "Remove Winner",
      tone: "warning",
    });
    if (!confirmed) return;
    try {
      setSubmitting(true);
      await winnerService.deleteWinner(winnerId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.winners(adminSelectedBatch?.id ?? null) });
      await loadData();
      await showAlert({
        message: "Winner successfully removed.",
        title: "Deleted",
        tone: "success",
      });
    } catch (e: any) {
      await showAlert({
        message: e?.message || "Could not delete winner.",
        title: "Error",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={styles.container}
    >
      <Screen scrollable>
        <Text style={[styles.title, { color: themeColors.text }]}>{t("resultsStudio")}</Text>
        <Text style={[styles.subtitle, { color: themeColors.muted, marginBottom: spacing.xs }]}>
          {t("resultsStudioIntro")}
        </Text>

        <View style={{ marginVertical: spacing.md, gap: spacing.xs }}>
          <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text }}>
            Scope Batch Context (Targets & Filters):
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 4 }}>
            <Pressable
              onPress={() => setAdminSelectedBatch(null)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radii.round,
                borderWidth: 1.5,
                borderColor: adminSelectedBatch === null ? themeColors.primary : themeColors.border,
                backgroundColor: adminSelectedBatch === null ? `${themeColors.primary}15` : themeColors.surfaceAlt,
              }}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: adminSelectedBatch === null ? typography.semiBold : typography.medium,
                color: adminSelectedBatch === null ? themeColors.primary : themeColors.text,
              }}>
                All Students
              </Text>
            </Pressable>
            {batches.map((batch) => {
              const isSelected = adminSelectedBatch?.id === batch.id;
              return (
                <Pressable
                  key={batch.id}
                  onPress={() => setAdminSelectedBatch(batch)}
                  style={{
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    borderRadius: radii.round,
                    borderWidth: 1.5,
                    borderColor: isSelected ? themeColors.primary : themeColors.border,
                    backgroundColor: isSelected ? `${themeColors.primary}15` : themeColors.surfaceAlt,
                  }}
                >
                  <Text style={{
                    fontSize: 12,
                    fontFamily: isSelected ? typography.semiBold : typography.medium,
                    color: isSelected ? themeColors.primary : themeColors.text,
                  }}>
                    {batch.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: spacing.md }}>
          <PrimaryButton
            label="🏆 Declare Winners"
            onPress={() => setActiveTab("declare")}
            variant={activeTab === "declare" ? "primary" : "secondary"}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="👁️ View Published"
            onPress={() => setActiveTab("view")}
            variant={activeTab === "view" ? "primary" : "secondary"}
            style={{ flex: 1 }}
          />
        </View>

        {activeTab === "declare" ? (
          <>
            <Panel style={[styles.section, styles.formSection]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Target event</Text>
          {events.length === 0 ? (
            <EmptyState
              message="Create at least one event before publishing results or archive entries."
              title="No events available"
            />
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    autoCapitalize="none"
                    autoCorrect={false}
                    label="Search events"
                    placeholder="Search title, venue, or description"
                    value={eventSearch}
                    onChangeText={setEventSearch}
                  />
                </View>
                <Pressable
                  onPress={() => setShowFilterMenu(!showFilterMenu)}
                  style={{ height: 48, width: 48, borderRadius: radii.md, backgroundColor: showFilterMenu ? themeColors.primary : themeColors.surfaceAlt, alignItems: "center", justifyContent: "center", borderColor: themeColors.border, borderWidth: 1 }}
                >
                  <IconSymbol name="filter" size={24} color={showFilterMenu ? "#FFFFFF" : themeColors.text} />
                </Pressable>
              </View>

              {showFilterMenu ? (
                <View style={{ backgroundColor: themeColors.surface, padding: 12, borderRadius: radii.md, borderColor: themeColors.border, borderWidth: 1, marginBottom: 16, gap: 12 }}>
                  <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Filter by status</Text>
                    <View style={styles.chipRow}>
                      {eventFilterOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => setEventFilter(option.value)}
                          style={[
                            styles.controlChip,
                            eventFilter === option.value && {
                              backgroundColor: themeColors.primary,
                              borderColor: themeColors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.controlChipText,
                              eventFilter === option.value &&
                                styles.controlChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                  <View style={styles.controlGroup}>
                    <Text style={styles.controlLabel}>Sort by</Text>
                    <View style={styles.chipRow}>
                      {eventSortOptions.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => setEventSort(option.value)}
                          style={[
                            styles.controlChip,
                            eventSort === option.value && {
                              backgroundColor: themeColors.primary,
                              borderColor: themeColors.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.controlChipText,
                              eventSort === option.value &&
                                styles.controlChipTextActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
              <Text style={[styles.listMeta, { color: themeColors.muted }]}>
                Showing {showAllTargetEvents ? visibleEvents.length : Math.min(3, visibleEvents.length)} of {events.length} events
              </Text>
              {visibleEvents.length === 0 ? (
                <EmptyState
                  message="Try another search term, event status, or sort option."
                  title="No matching events"
                />
              ) : (
                <View style={styles.eventList}>
                  {(showAllTargetEvents ? visibleEvents : visibleEvents.slice(0, 3)).map((event) => (
                    <Pressable
                      key={event.id}
                      onPress={() => void selectEvent(event.id)}
                      style={[
                        styles.eventOption,
                        selectedEventId === event.id && {
                          backgroundColor: themeColors.primarySoft,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <View style={styles.eventOptionText}>
                        <Text style={styles.eventOptionTitle}>
                          {event.title}
                        </Text>
                        <Text style={styles.eventOptionMeta}>
                          {formatEventDate(event.date)} • {event.venue}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.selectText,
                          selectedEventId === event.id && {
                            color: themeColors.primary,
                          },
                        ]}
                      >
                        {selectedEventId === event.id ? "Selected" : "Select"}
                      </Text>
                    </Pressable>
                  ))}

                  {visibleEvents.length > 3 ? (
                    <Pressable
                      onPress={() => setShowAllTargetEvents(!showAllTargetEvents)}
                      style={{ alignSelf: "center", paddingVertical: 10, paddingHorizontal: 16 }}
                    >
                      <Text style={{ fontFamily: typography.semiBold, fontSize: 13, color: themeColors.primary }}>
                        {showAllTargetEvents ? "Show Less" : `View All Events (${visibleEvents.length})`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </>
          )}
        </Panel>

        <Panel style={[styles.section, styles.formSection]}>
          {!activeSession ? (
            <View
              style={[
                styles.editingBanner,
                {
                  backgroundColor: themeColors.primarySoft,
                  borderColor: themeColors.primary,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text style={[styles.editingText, { color: themeColors.primary }]}>
                ⚠️ Publishing disabled: There is currently no active academic session. Please create or activate one in Settings first.
              </Text>
            </View>
          ) : null}
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 4 }]}>Publish winners</Text>
              <Text style={[styles.sectionHint, { color: themeColors.muted }]}>
                Select from registered students for {selectedEvent?.title ?? "an event"}.
              </Text>
            </View>
            <View style={styles.countPill}>
              <Text style={[styles.countPillText, { color: themeColors.primary }]}>
                {selectedEventWinners.length}
              </Text>
            </View>
          </View>
          {registrationLoading ? (
            <View style={styles.inlineLoading}>
              <LoadingState message="Fetching candidates..." />
            </View>
          ) : registrations.length === 0 ? (
            <EmptyState
              message="Only registered students can be selected as winners for this event."
              title="No registered candidates"
            />
          ) : (
            <>
            <TextField
              autoCapitalize="none"
              autoCorrect={false}
              label={isTeamEvent ? "Search registered groups" : "Search registered students"}
              placeholder={isTeamEvent ? "Search group name or member name" : "Search name, email, or phone"}
              value={candidateSearch}
              onChangeText={setCandidateSearch}
            />
            {draftWinners.length > 0 ? (
              <View style={styles.draftWinnersBox}>
                <Text style={[styles.listMeta, { color: themeColors.muted }]}>Selected winners</Text>
                {draftWinners.map((winner) => (
                  <View key={winner.registrationId} style={styles.draftWinnerRow}>
                    <Pressable
                      onPress={() => winner.userId ? router.push(`/(app)/student-detail?userId=${winner.userId}`) : null}
                      style={styles.draftWinnerText}
                    >
                      <Text style={styles.candidateName}>{winner.name}</Text>
                      <Text style={styles.candidateMeta}>{winner.email ? winner.email : "Group / Team Winner"}</Text>
                    </Pressable>
                    <View style={styles.positionInputWrap}>
                      <TextField
                        label="Position"
                        placeholder="1st Place"
                        value={winner.position}
                        onChangeText={(position) =>
                          updateDraftWinnerPosition(winner.registrationId, position)
                        }
                      />
                    </View>
                    <Pressable
                      onPress={() => removeDraftWinner(winner.registrationId)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.candidateList}>
              {isTeamEvent ? (
                filteredCandidateTeams.map((team) => {
                  const selected = draftWinners.some((winner) => (winner as any).teamId === team.teamId);
                  const memberNames = team.members.map(m => m.name).join(" • ");
                  return (
                    <View
                      key={team.teamId}
                      style={[
                        styles.candidateCard,
                        selected && {
                          backgroundColor: themeColors.primarySoft,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <View style={styles.candidateText}>
                        <Text style={styles.candidateName}>{team.name}</Text>
                        <Text style={styles.candidateMeta}>
                          Members: {memberNames}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => addDraftWinnerTeam(team)}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: selected ? themeColors.primary : themeColors.surfaceAlt }}
                      >
                        <Text style={[styles.selectText, { color: selected ? "#FFFFFF" : themeColors.primary }]}>
                          {selected ? "Added" : "Add"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                filteredCandidates.map((registration) => {
                  const candidateName =
                    registration.users?.name ?? registration.users?.email ?? "Student";
                  const selected = draftWinners.some((winner) => winner.registrationId === registration.id);

                  return (
                    <View
                      key={registration.id}
                      style={[
                        styles.candidateCard,
                        selected && {
                          backgroundColor: themeColors.primarySoft,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => router.push(`/(app)/student-detail?userId=${registration.user_id}`)}
                        style={styles.candidateText}
                      >
                        <Text style={styles.candidateName}>{candidateName}</Text>
                        <Text style={styles.candidateMeta}>
                          {registration.users?.email ?? "No email"} • Registered {formatEventDate(registration.created_at)}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => addDraftWinner(registration)}
                        style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.md, backgroundColor: selected ? themeColors.primary : themeColors.surfaceAlt }}
                      >
                        <Text style={[styles.selectText, { color: selected ? "#FFFFFF" : themeColors.primary }]}>
                          {selected ? "Added" : "Add"}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </View>
            <Text style={[styles.listMeta, { color: themeColors.muted }]}>
              Showing {isTeamEvent ? filteredCandidateTeams.length : filteredCandidates.length} candidates. Use search for large lists.
            </Text>
            {!canDeclareResults ? (
              <Text style={[styles.listMeta, { color: "#DC2626" }]}>
                Results can be declared after {selectedEvent ? formatEventDate(selectedEvent.date) : "the event ends"}.
              </Text>
            ) : null}
            </>
          )}
          <View style={styles.formActions}>
            <PrimaryButton
              disabled={!winnersReady || !canDeclareResults || submitting || !activeSession}
              icon="checkmark"
              label={submitting ? "Publishing..." : `Publish ${draftWinners.length || ""} Winner${draftWinners.length === 1 ? "" : "s"}`}
              onPress={publishWinners}
            />
          </View>
        </Panel>

        <Panel style={[styles.section, styles.formSection]}>
          {!activeSession ? (
            <View
              style={[
                styles.editingBanner,
                {
                  backgroundColor: themeColors.primarySoft,
                  borderColor: themeColors.primary,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Text style={[styles.editingText, { color: themeColors.primary }]}>
                ⚠️ Publishing disabled: There is currently no active academic session. Please create or activate one in Settings first.
              </Text>
            </View>
          ) : null}
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Archive event</Text>
          <TextField
            label="Archive Description"
            multiline
            placeholder="Capture highlights, outcomes, and context for this event"
            value={repositoryForm.description}
            onChangeText={(description) => setRepositoryForm({ description })}
          />
          <PrimaryButton
            label={
              repositoryImageUri
                ? "Archive image selected"
                : "Pick Archive Image"
            }
            onPress={() => void chooseImage()}
            variant="secondary"
          />
          <View style={styles.formActions}>
            <PrimaryButton
              disabled={!repositoryFormReady || submitting || !activeSession}
              icon="plus"
              label="Add Archive Item"
              onPress={publishRepositoryItem}
            />
          </View>
        </Panel>
      </>
    ) : (
      <>
        <Panel style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Published winners</Text>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, marginVertical: 12 }}>
            <View style={{ flex: 1 }}>
              <TextField
                autoCapitalize="none"
                autoCorrect={false}
                label="Search published results"
                placeholder="Search event title or student name"
                value={publishedSearch}
                onChangeText={setPublishedSearch}
              />
            </View>
            <Pressable
              onPress={() => setShowPublishedFilterMenu(!showPublishedFilterMenu)}
              style={{ height: 48, width: 48, borderRadius: radii.md, backgroundColor: showPublishedFilterMenu ? themeColors.primary : themeColors.surfaceAlt, alignItems: "center", justifyContent: "center", borderColor: themeColors.border, borderWidth: 1 }}
            >
              <IconSymbol name="filter" size={24} color={showPublishedFilterMenu ? "#FFFFFF" : themeColors.text} />
            </Pressable>
          </View>

          {showPublishedFilterMenu ? (
            <View style={{ backgroundColor: themeColors.surface, padding: 12, borderRadius: radii.md, borderColor: themeColors.border, borderWidth: 1, marginBottom: 16, gap: 12 }}>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Sort by</Text>
                <View style={styles.chipRow}>
                  {[
                    { label: "Event Title (A-Z)", value: "eventTitle" },
                    { label: "Most Winners", value: "winnerCount" },
                  ].map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setPublishedSort(option.value as any)}
                      style={[
                        styles.controlChip,
                        publishedSort === option.value && {
                          backgroundColor: themeColors.primary,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.controlChipText,
                          publishedSort === option.value && styles.controlChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {filteredWinnerSections.length === 0 ? (
            <EmptyState
              message={winners.length === 0 ? "Winner cards will appear here once published." : "No published winners match your search."}
              title={winners.length === 0 ? "No winners yet" : "No results found"}
            />
          ) : (
            filteredWinnerSections.map((section) => (
              <Panel key={section.eventId} style={styles.eventWinnerSection}>
                <View style={styles.eventWinnerHeader}>
                  <View style={styles.eventWinnerTitleBlock}>
                    <Text style={[styles.itemTitle, { color: themeColors.text }]}>
                      {section.eventTitle}
                    </Text>
                    <Text style={[styles.itemMeta, { color: themeColors.muted }]}>
                      {section.meta}
                    </Text>
                  </View>
                  <Text style={[styles.winnerCount, { color: themeColors.primary }]}>
                    {section.winners.length}
                  </Text>
                </View>
                {section.winners.map((winner) => {
                  const isEditing = editingWinner?.id === winner.id;
                  const isMenuOpen = activeMenuWinnerId === winner.id;
                  return (
                    <View key={winner.id} style={{ borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 12, paddingBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        {isEditing ? (
                          <View style={{ flex: 1, gap: 8, paddingVertical: 4 }}>
                            <Text style={[styles.winnerName, { color: themeColors.text, paddingHorizontal: 4, marginBottom: 8 }]}>
                              Editing: {editingWinner.name}
                            </Text>
                            <TextField
                              label="Position / Title"
                              value={editingWinner.position}
                              onChangeText={(val) => setEditingWinner((prev) => prev ? { ...prev, position: val } : null)}
                            />
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                              <PrimaryButton
                                label="Save"
                                onPress={handleSaveWinnerEdit}
                                style={{ flex: 1 }}
                              />
                              <PrimaryButton
                                label="Cancel"
                                onPress={() => setEditingWinner(null)}
                                variant="secondary"
                                style={{ flex: 1 }}
                              />
                            </View>
                          </View>
                        ) : (
                          <>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.winnerName, { color: themeColors.text }]}>
                                {winner.users?.name ?? winner.name}
                              </Text>
                              <Text style={[styles.winnerPosition, { color: themeColors.muted }]}>
                                {winner.position}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => setActiveMenuWinnerId(isMenuOpen ? null : winner.id)}
                              style={{ padding: 8, borderRadius: radii.round, backgroundColor: isMenuOpen ? themeColors.primary : themeColors.surfaceAlt }}
                            >
                              <IconSymbol name="ellipsis" size={20} color={isMenuOpen ? "#FFFFFF" : themeColors.text} />
                            </Pressable>
                          </>
                        )}
                      </View>

                      {isMenuOpen && !isEditing ? (
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, padding: 8, backgroundColor: themeColors.surfaceAlt, borderRadius: radii.md, justifyContent: "flex-end", alignItems: "center" }}>
                          <Pressable
                            onPress={() => {
                              setActiveMenuWinnerId(null);
                              handleEditWinner(winner);
                            }}
                            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: themeColors.surface, borderRadius: radii.sm, borderColor: themeColors.border, borderWidth: 1 }}
                          >
                            <IconSymbol name="pencil" size={16} color={themeColors.text} />
                            <Text style={{ fontFamily: typography.medium, fontSize: 13, color: themeColors.text }}>Edit Position</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setActiveMenuWinnerId(null);
                              handleDeleteWinner(winner.id);
                            }}
                            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#EF444420", borderRadius: radii.sm }}
                          >
                            <IconSymbol name="trash.fill" size={16} color="#EF4444" />
                            <Text style={{ fontFamily: typography.medium, fontSize: 13, color: "#EF4444" }}>Delete</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </Panel>
            ))
          )}
        </Panel>

        <Panel style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t("archiveEntries")}</Text>
          {repositoryItems.length === 0 ? (
            <EmptyState
              message="Repository entries will appear here after publishing."
              title="Archive is empty"
            />
          ) : (
            repositoryItems.map((item) => (
              <Panel key={item.id} style={styles.subCard}>
                <Text style={styles.itemTitle}>
                  {item.events?.title ?? "Past Event"}
                </Text>
                <Text style={styles.itemBody}>{item.description}</Text>
              </Panel>
            ))
          )}
        </Panel>
      </>
    )}
  </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  editingBanner: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.accentGreen,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  editingText: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  candidateCard: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  candidateCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  candidateList: {
    gap: spacing.sm,
  },
  candidateMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  candidateName: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  candidateText: {
    flex: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  container: {
    flex: 1,
  },
  controlChip: {
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  controlChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  controlChipText: {
    color: colors.muted,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  controlChipTextActive: {
    color: colors.white,
  },
  controlGroup: {
    gap: spacing.xs,
  },
  controlLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  countPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    height: 32,
    minWidth: 32,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
  },
  countPillText: {
    color: colors.primary,
    fontFamily: typography.bold,
    fontSize: 14,
  },
  draftWinnerRow: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  draftWinnersBox: {
    gap: spacing.sm,
  },
  draftWinnerText: {
    flex: 1,
    minWidth: 150,
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  eventList: {
    gap: spacing.sm,
  },
  eventOption: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  eventOptionActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  eventOptionMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  eventOptionText: {
    flex: 1,
  },
  eventOptionTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  eventWinnerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  eventWinnerSection: {
    backgroundColor: colors.surfaceAlt,
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  eventWinnerTitleBlock: {
    flex: 1,
  },
  formSection: {
    gap: spacing.md,
  },
  itemBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  itemMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 4,
  },
  itemTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
  },
  listMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: -spacing.xs,
  },
  positionInputWrap: {
    minWidth: 130,
  },
  removeButton: {
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeButtonText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
  },
  selectText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  selectTextActive: {
    color: colors.text,
  },
  subCard: {
    backgroundColor: colors.surfaceAlt,
    marginTop: spacing.md,
  },
  winnerCount: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.round,
    fontFamily: typography.semiBold,
    fontSize: 12,
    minWidth: 28,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  winnerName: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  winnerPosition: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  winnerRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.sm,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  inlineLoading: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
});

function getOrdinalSuffix(value: number) {
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return "th";
  }

  switch (value % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}
