import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Share, PanResponder } from 'react-native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Panel } from '@/components/ui/Panel';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useEventByIdQuery } from '@/src/hooks/queries/useEventByIdQuery';
import { useRegisteredEventsQuery } from '@/src/hooks/queries/useRegisteredEventsQuery';
import { useRegistrationCountsQuery } from '@/src/hooks/queries/useRegistrationCountsQuery';
import { useAppFeedback } from '@/src/providers/app-feedback-provider';
import { useAuthStore } from '@/src/store/auth-store';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { formatEventDate } from '@/src/utils/format';
import { getRegistrationState } from '@/src/utils/registration-status';
import { useThemeColors } from '@/src/utils/settings-effects';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import { authService } from '@/src/services/auth-service';
import { eventService } from '@/src/services/event-service';
import { UserProfile } from '@/src/types/app';

export default function EventDetailsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const themeColors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAppFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [updatingInvite, setUpdatingInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteeInput, setInviteeInput] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const profile = useAuthStore((state) => state.profile);
  const userId = profile?.id;
  const isAdmin = profile?.role === 'admin';
  const eventId = id ?? '';
  const { data: event = null, isLoading: eventLoading } = useEventByIdQuery(eventId);
  const { data: registrations = [], isLoading: registeredLoading } =
    useRegisteredEventsQuery(userId);
  const { data: registrationCounts = {} } = useRegistrationCountsQuery(
    eventId ? [eventId] : [],
  );
  const userRegistration = registrations.find(
    (reg) => reg.event_id === eventId,
  );
  const registered = Boolean(userRegistration);
  const myTeamName = userRegistration?.event_teams?.name;
  const isLeader = userRegistration?.event_teams?.leader_id === userId;
  const myStatus = userRegistration?.status ?? 'accepted';
  const registrationCount = registrationCounts[eventId] ?? 0;
  const registrationState = event
    ? getRegistrationState(event, { closed: "#DC2626", open: "#16A34A" })
    : null;
  const isTeamEvent = (event?.max_team_size ?? 1) > 1;
  const isAtCapacity = event?.max_registrations ? registrationCount >= event.max_registrations : false;
  const seatsLeft = event?.max_registrations ? Math.max(0, event.max_registrations - registrationCount) : null;
  const canRegister =
    Boolean(event) && !isAdmin && !registered && Boolean(registrationState?.isOpen) && !isAtCapacity;

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () => authService.listUsers(),
    enabled: isLeader,
  });

  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");

  const currentMembers = userRegistration?.event_teams?.registrations || [];
  const availableStudents = allUsers.filter(u => {
    if (u.id === userId || u.role === 'admin' || currentMembers.some(m => m.user_id === u.id)) {
      return false;
    }
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.email, u.phone].filter(Boolean).some(val => val?.toLowerCase().includes(q));
  });

  const handleSelectStudentFromDirectory = async (student: UserProfile, teamId: string) => {
    if (!student.id) return;
    try {
      setSubmittingInvite(true);
      await eventService.addTeamMember(eventId, teamId, userId ?? "", student.id);
      setShowStudentModal(false);
      setStudentSearch("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: ['registrations', 'counts'] }),
      ]);
      await showAlert({
        title: "Invite Sent",
        message: `${student.name || student.email} has been successfully invited to your group!`,
        tone: "success"
      });
    } catch (error: any) {
      await showAlert({
        title: "Invite Failed",
        message: error?.message || "Could not invite student.",
        tone: "error"
      });
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleInviteResponse = async (regId: string, accept: boolean) => {
    try {
      setUpdatingInvite(true);
      await eventService.respondToTeamInvite(regId, accept);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: ['pendingInvites', userId] }),
        queryClient.invalidateQueries({ queryKey: ['registrations', 'counts'] }),
      ]);
      await showAlert({
        message: accept ? "You have successfully joined the group!" : "Invitation declined.",
        title: accept ? "Group Accepted" : "Declined",
        tone: accept ? "success" : "default",
      });
      if (!accept) {
        router.replace('/(app)/(tabs)/events');
      }
    } catch (error: any) {
      await showAlert({
        message: error?.message || "Could not update invitation status.",
        title: "Error",
        tone: "error",
      });
    } finally {
      setUpdatingInvite(false);
    }
  };

  const handleRemoveTeammate = async (regId: string, memberName: string) => {
    try {
      await eventService.removeTeamMember(regId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: ['registrations', 'counts'] }),
      ]);
      await showAlert({
        title: "Teammate Removed",
        message: `${memberName} has been removed from your group.`,
        tone: "success"
      });
    } catch (error: any) {
      await showAlert({
        title: "Error",
        message: error?.message || "Could not remove teammate.",
        tone: "error"
      });
    }
  };

  const handleInviteAdditional = async (teamId: string) => {
    if (!inviteeInput.trim()) return;

    try {
      setSubmittingInvite(true);
      await eventService.addTeamMember(eventId, teamId, userId ?? "", inviteeInput);
      setInviteeInput("");
      setInviting(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: ['registrations', 'counts'] }),
      ]);
      await showAlert({
        title: "Invite Sent",
        message: "The student has been successfully invited to your group!",
        tone: "success"
      });
    } catch (error: any) {
      await showAlert({
        title: "Invite Failed",
        message: error?.message || "Could not invite student.",
        tone: "error"
      });
    } finally {
      setSubmittingInvite(false);
    }
  };

  const saveEventImage = async () => {
    if (!event?.image_url || savingImage) {
      return;
    }

    try {
      setSavingImage(true);
      const currentPermission = await MediaLibrary.getPermissionsAsync(true, ['photo']);
      let permission = currentPermission;

      if (!permission.granted && permission.canAskAgain) {
        permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      }

      if (!permission.granted) {
        await showAlert({
          message: 'Allow photo library access to save this event image.',
          title: 'Permission needed',
          tone: 'warning',
        });
        return;
      }

      const extensionMatch = event.image_url.split('?')[0]?.match(/\.(png|jpe?g|webp)$/i);
      const extension = extensionMatch?.[1]?.toLowerCase() ?? 'jpg';
      const fileUri = `${FileSystem.cacheDirectory}event-${event.id}.${extension}`;
      const download = await FileSystem.downloadAsync(event.image_url, fileUri);

      await MediaLibrary.saveToLibraryAsync(download.uri);
      await showAlert({
        message: 'Event image saved to your gallery.',
        title: 'Image saved',
        tone: 'success',
      });
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : 'Please try again.',
        title: 'Unable to save image',
        tone: 'error',
      });
    } finally {
      setSavingImage(false);
    }
  };

  const handleShareImage = async () => {
    if (!event?.image_url) return;
    try {
      await Share.share({
        url: event.image_url,
        message: `Check out this event: ${event.title}\n${event.image_url}`,
        title: event.title,
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

  if (eventLoading || registeredLoading) {
    return <LoadingState fullScreen message="Loading event details..." />;
  }

  if (!event) {
    return (
      <Screen>
        <BackButton fallbackHref="/(app)/(tabs)/events" />
        <EmptyState message="The event could not be found." title="Missing event" />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <BackButton fallbackHref="/(app)/(tabs)/events" />
      {event.image_url ? (
        <Pressable
          accessibilityLabel="Open event image preview"
          accessibilityRole="imagebutton"
          onPress={() => setImagePreviewOpen(true)}
          style={styles.eventImageButton}
        >
          <Image
            contentFit="cover"
            source={{ uri: event.image_url }}
            style={styles.eventImage}
          />
          <View style={styles.imageOverlay}>
            <IconSymbol color={colors.white} name="expand-outline" size={18} />
          </View>
        </Pressable>
      ) : null}
      <Panel style={styles.hero}>
        <View style={styles.topRow}>
          <View style={styles.heroText}>
            <Text style={[styles.title, { color: themeColors.text }]}>{event.title}</Text>
            <Text style={[styles.meta, { color: themeColors.muted }]}>{formatEventDate(event.date)}</Text>
            <Text style={[styles.meta, { color: themeColors.muted }]}>{event.venue}</Text>
            {event.committees && event.committees.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: typography.bold, color: themeColors.text, marginBottom: 6 }}>Committees</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {event.committees.map(c => (
                    <View key={c} style={{ backgroundColor: themeColors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {event.clubs && event.clubs.length > 0 ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: typography.bold, color: themeColors.text, marginBottom: 6 }}>Clubs</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {event.clubs.map(c => (
                    <View key={c} style={{ backgroundColor: themeColors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          <IconSymbol color={themeColors.primary} name="sparkles" size={28} />
        </View>
        <Text style={[styles.description, { color: themeColors.muted }]}>{event.description}</Text>
        <View style={[styles.registrationPanel, { backgroundColor: themeColors.background }]}>
          <View style={styles.registrationRow}>
            <View style={styles.regCol}>
              <Text style={[styles.regLabel, { color: themeColors.muted }]}>Students Registered</Text>
              <Text style={[styles.regValue, { color: themeColors.primary }]}>{registrationCount}{event.max_registrations ? ` / ${event.max_registrations}` : ""}</Text>
              {event.max_registrations ? (
                <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: seatsLeft && seatsLeft > 0 ? "#10B981" : "#EF4444", marginTop: 2 }}>
                  {seatsLeft && seatsLeft > 0 ? `${seatsLeft} seats left` : "0 seats left (Full)"}
                </Text>
              ) : null}
            </View>
            <View style={[styles.regDivider, { backgroundColor: themeColors.border }]} />
            <View style={styles.regCol}>
              <Text style={[styles.regLabel, { color: themeColors.muted }]}>Registration</Text>
              <Text
                style={[
                  styles.regValue,
                  { color: registrationState?.borderColor ?? themeColors.primary },
                ]}
              >
                {event.registrations_paused
                  ? 'Paused'
                  : registrationState?.isOpen
                    ? event.registration_until
                      ? registrationState.label.replace("Registration end: ", "")
                      : "Closes at start"
                    : "Closed"}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.pills, { flexWrap: "wrap", flexDirection: "row" }]}>
          {isTeamEvent ? (
            <Pill label={`Group Event: ${event.min_team_size} - ${event.max_team_size} Members`} tone="brand" />
          ) : (
            <Pill label="Solo / Individual Event" tone="default" />
          )}
          {!isAdmin ? (
            <Pill
              label={registered ? 'Already registered' : registrationState?.label ?? 'Registration open'}
              tone={registered ? 'success' : registrationState?.isOpen ? 'brand' : 'default'}
            />
          ) : null}
          <Pill label={`${registrationCount} joined`} tone="default" />
        </View>
        {event?.pdf_url || event?.google_drive_link || (event?.links && event.links.length > 0) ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: themeColors.border }}>
            {event?.pdf_url ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const url = event.pdf_url!;
                  void WebBrowser.openBrowserAsync(
                    Platform.OS === 'android' ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}` : url
                  );
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: themeColors.primarySoft, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: themeColors.primary + "30" }}
              >
                <Ionicons name="document-text" size={16} color={themeColors.primary} />
                <Text style={{ fontSize: 13, fontFamily: typography.bold, color: themeColors.primary }}>Attached Document</Text>
              </TouchableOpacity>
            ) : null}

            {event?.google_drive_link ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => void Linking.openURL(event.google_drive_link!)}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#818CF830" }}
              >
                <Ionicons name="paper-plane" size={16} color="#6366F1" />
                <Text style={{ fontSize: 13, fontFamily: typography.bold, color: "#6366F1" }}>Drive Link 1</Text>
              </TouchableOpacity>
            ) : null}

            {event?.links?.map((link, idx) => {
              if (link.type === 'drive') {
                const driveIndex = event.links!.slice(0, idx + 1).filter(l => l.type === 'drive').length + (event?.google_drive_link ? 1 : 0);
                return (
                  <TouchableOpacity
                    key={`custom-link-${idx}`}
                    activeOpacity={0.8}
                    onPress={() => void Linking.openURL(link.url)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF2FF", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#818CF830" }}
                  >
                    <Ionicons name="paper-plane" size={16} color="#6366F1" />
                    <Text style={{ fontSize: 13, fontFamily: typography.bold, color: "#6366F1" }}>{`Drive Link ${driveIndex}`}</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={`custom-link-${idx}`}
                  activeOpacity={0.8}
                  onPress={() => void Linking.openURL(link.url)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: themeColors.surfaceAlt, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: themeColors.border }}
                >
                  <Ionicons name="link" size={16} color={themeColors.text} />
                  <Text style={{ fontSize: 13, fontFamily: typography.bold, color: themeColors.text }}>{link.title || "Link"}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </Panel>

      {myTeamName && myStatus === 'pending' ? (
        <Panel style={{ marginBottom: spacing.lg, backgroundColor: "#F59E0B12", borderColor: "#F59E0B35", borderWidth: 1, elevation: 0, shadowOpacity: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <IconSymbol name="bell-badge" size={22} color="#F59E0B" />
            <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.text }}>Group Invitation Pending</Text>
          </View>
          <Text style={{ fontSize: 14, color: themeColors.text, marginBottom: 12, lineHeight: 20 }}>
            You have been invited to partner up and join this event under group <Text style={{ fontFamily: typography.bold, color: themeColors.text }}>&quot;{myTeamName}&quot;</Text>.
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: themeColors.surface, padding: 12, borderRadius: 12, marginBottom: 14, borderColor: themeColors.border, borderWidth: 1 }}>
            {userRegistration?.inviter?.avatar_url ? (
              <Image source={{ uri: userRegistration.inviter.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.primary }}>
                  {(userRegistration?.inviter?.name || "S")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: themeColors.muted, fontFamily: typography.medium }}>Invited by</Text>
              <Text style={{ fontSize: 15, fontFamily: typography.bold, color: themeColors.text }}>
                {userRegistration?.inviter?.name || "A teammate"}
              </Text>
              {userRegistration?.inviter?.email ? (
                <Text style={{ fontSize: 12, color: themeColors.muted }}>{userRegistration.inviter.email}</Text>
              ) : null}
            </View>
          </View>

          {userRegistration?.event_teams?.registrations && userRegistration.event_teams.registrations.length > 0 ? (
            <View style={{ marginBottom: 16, gap: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.muted }}>
                Group Members in &quot;{myTeamName}&quot; ({userRegistration.event_teams.registrations.length})
              </Text>
              {userRegistration.event_teams.registrations.map((m: any) => {
                const mName = m.users?.name || "Student";
                const isLeaderMem = m.user_id === userRegistration.event_teams?.leader_id;
                const isSelf = m.user_id === userId;
                const st = m.status ?? 'accepted';

                return (
                  <View key={m.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomColor: themeColors.border, borderBottomWidth: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {m.users?.avatar_url ? (
                        <Image source={{ uri: m.users.avatar_url }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{mName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text }}>
                            {mName} {isSelf ? "(You)" : ""}
                          </Text>
                          {isLeaderMem ? <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}><Text style={{ color: "#fff", fontSize: 9, fontFamily: typography.semiBold }}>Leader</Text></View> : null}
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: typography.regular, color: themeColors.muted }}>{m.users?.email}</Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: st === 'accepted' ? '#10B98120' : st === 'pending' ? '#F59E0B20' : '#EF444420', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 11, color: st === 'accepted' ? '#10B981' : st === 'pending' ? '#F59E0B' : '#EF4444', fontFamily: typography.semiBold, textTransform: 'capitalize' }}>{st}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 12 }}>
            <PrimaryButton
              label="Decline"
              onPress={() => handleInviteResponse(userRegistration!.id, false)}
              variant="ghost"
              disabled={updatingInvite}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={updatingInvite ? "Updating..." : "Accept Invitation"}
              onPress={() => handleInviteResponse(userRegistration!.id, true)}
              loading={updatingInvite}
              disabled={updatingInvite}
              style={{ flex: 1, backgroundColor: "#10B981" }}
            />
          </View>
        </Panel>
      ) : myTeamName ? (
        <Panel style={{ marginBottom: spacing.lg, backgroundColor: "#3B82F612", borderColor: "#3B82F635", borderWidth: 1, elevation: 0, shadowOpacity: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <IconSymbol name="people-outline" size={20} color="#3B82F6" />
              <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.text }}>Your Group: {myTeamName}</Text>
            </View>
            <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, color: "#fff", fontFamily: typography.semiBold }}>{isLeader ? "Leader" : "Member"}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: themeColors.muted, fontFamily: typography.medium }}>
            Status: <Text style={{ color: myStatus === 'accepted' ? '#10B981' : '#F59E0B', fontFamily: typography.semiBold, textTransform: 'capitalize' }}>{myStatus}</Text>
          </Text>

          {userRegistration?.event_teams?.registrations && userRegistration.event_teams.registrations.length > 0 ? (
            <View style={{ marginTop: 12, borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 10, gap: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.muted, marginBottom: 2 }}>
                Group Teammates ({userRegistration.event_teams.registrations.length})
              </Text>
              {userRegistration.event_teams.registrations.map((m, index) => {
                const mName = m.users?.name || "Student";
                const isLeaderMem = m.user_id === userRegistration.event_teams?.leader_id;
                const isSelf = m.user_id === userId;
                const canRemove = isLeader && !isSelf;
                const st = m.status ?? 'accepted';
                const isLast = index === (userRegistration.event_teams?.registrations?.length ?? 1) - 1;

                return (
                  <View key={m.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomColor: isLast ? "transparent" : themeColors.border, borderBottomWidth: isLast ? 0 : 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {m.users?.avatar_url ? (
                        <Image source={{ uri: m.users.avatar_url }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                      ) : (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{mName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text }}>
                            {mName} {isSelf ? "(You)" : ""}
                          </Text>
                          {isLeaderMem ? <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}><Text style={{ color: "#fff", fontSize: 9, fontFamily: typography.semiBold }}>Leader</Text></View> : null}
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: typography.regular, color: themeColors.muted }}>{m.users?.email}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ backgroundColor: st === 'accepted' ? '#10B98120' : st === 'pending' ? '#F59E0B20' : '#EF444420', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontSize: 11, color: st === 'accepted' ? '#10B981' : st === 'pending' ? '#F59E0B' : '#EF4444', fontFamily: typography.semiBold, textTransform: 'capitalize' }}>{st}</Text>
                      </View>
                      {canRemove ? (
                        <Pressable onPress={() => handleRemoveTeammate(m.id, mName)} style={{ padding: 6, backgroundColor: "#EF444415", borderRadius: 16 }}>
                          <IconSymbol name="trash.fill" size={14} color="#EF4444" />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {isLeader && event && event.max_team_size > userRegistration.event_teams.registrations.length ? (
                <View style={{ marginTop: 8, borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 10 }}>
                  {inviting ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.text }}>
                        Invite Teammate ({userRegistration.event_teams.registrations.length}/{event.max_team_size} slots filled)
                      </Text>
                      <TextField
                        label="Student Email or Phone Number"
                        placeholder="student@example.com or 9876543210"
                        value={inviteeInput}
                        onChangeText={setInviteeInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <PrimaryButton
                          label="Cancel"
                          onPress={() => { setInviting(false); setInviteeInput(""); }}
                          variant="ghost"
                          style={{ flex: 1 }}
                        />
                        <PrimaryButton
                          label={submittingInvite ? "Inviting..." : "Send Invite"}
                          onPress={() => handleInviteAdditional(userRegistration.event_teams!.id)}
                          disabled={submittingInvite || !inviteeInput.trim()}
                          loading={submittingInvite}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      <PrimaryButton
                        label={`+ Select Teammate from Directory (${event.max_team_size - userRegistration.event_teams.registrations.length} available)`}
                        onPress={() => setShowStudentModal(true)}
                        variant="secondary"
                        icon="people-outline"
                      />
                      <PrimaryButton
                        label="+ Invite by Email"
                        onPress={() => setInviting(true)}
                        variant="ghost"
                      />
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          ) : null}
        </Panel>
      ) : null}

      {isAtCapacity && !registered ? (
        <View style={{ backgroundColor: "#FEF2F2", borderColor: "#F87171", borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: typography.bold, color: "#991B1B" }}>Event at Capacity</Text>
            <Text style={{ fontSize: 13, color: "#B91C1C", marginTop: 2 }}>This event has reached its maximum registration limit of {event.max_registrations} seats.</Text>
          </View>
        </View>
      ) : null}

      {!isAdmin ? (
        <PrimaryButton
          disabled={!canRegister}
          label={
            registered
              ? 'Registered'
              : isAtCapacity
                ? 'Event Full (0 Seats Left)'
                : canRegister
                  ? 'Register Now'
                  : 'Registration Closed'
          }
          onPress={() =>
            router.push({ pathname: '/(app)/events/[id]/register', params: { id: event.id } })
          }
          variant={registered || !canRegister ? 'secondary' : 'primary'}
        />
      ) : null}

      {event.image_url ? (
        <Modal
          visible={imagePreviewOpen}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setImagePreviewOpen(false); resetPreviewZoom(); }}
        >
          <View style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
              <Pressable onPress={() => { setImagePreviewOpen(false); resetPreviewZoom(); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
              </Pressable>
              <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Image Preview</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" }} {...previewPanResponder.panHandlers}>
              <Image
                source={{ uri: event.image_url }}
                contentFit="contain"
                style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", transform: [{ scale: previewScale }, { translateX: previewPan.x }, { translateY: previewPan.y }] }}
              />
            </View>
            <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 24), alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, gap: 16, borderWidth: 1, borderColor: themeColors.border, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              <Pressable onPress={() => setPreviewScale((s) => Math.min(s + 0.5, 4.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="add" size={22} color={themeColors.primary} />
              </Pressable>
              <Pressable onPress={() => setPreviewScale((s) => Math.max(s - 0.5, 1.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="remove" size={22} color={themeColors.primary} />
              </Pressable>
              <View style={{ width: 1, height: 24, backgroundColor: themeColors.border }} />
              <Pressable onPress={() => void saveEventImage()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="download" size={20} color={themeColors.primary} />
              </Pressable>
              <Pressable onPress={() => void handleShareImage()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
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
      ) : null}

      <Modal
        visible={showStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeaderModal}>
              <TouchableOpacity onPress={() => setShowStudentModal(false)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <IconSymbol name="chevron.left" size={24} color={themeColors.primary} />
                <Text style={{ fontFamily: typography.semiBold, fontSize: 16, color: themeColors.primary }}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitleModal, { color: themeColors.text }]}>Select Teammate</Text>
              <TouchableOpacity onPress={() => setShowStudentModal(false)} style={styles.modalCloseButton}>
                <IconSymbol name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>
            <View style={[styles.modalSearchBox, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
              <IconSymbol name="search" size={20} color={themeColors.muted} />
              <TextInput
                placeholder="Search by name, email, or phone..."
                placeholderTextColor={themeColors.muted}
                style={[styles.modalSearchInput, { color: themeColors.text }]}
                value={studentSearch}
                onChangeText={setStudentSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView
              style={styles.studentList}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
            >
              {availableStudents.length === 0 ? (
                <Text style={[styles.noStudentsText, { color: themeColors.muted }]}>
                  {studentSearch ? "No matching students found." : "No available students."}
                </Text>
              ) : (
                availableStudents.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={[styles.studentItem, { borderBottomColor: themeColors.border }]}
                    onPress={() => handleSelectStudentFromDirectory(student, userRegistration!.event_teams!.id)}
                  >
                    {student.avatar_url ? (
                      <Image source={{ uri: student.avatar_url }} style={styles.studentAvatar} />
                    ) : (
                      <View style={[styles.studentAvatarFallback, { backgroundColor: themeColors.primarySoft }]}>
                        <Text style={[styles.studentAvatarText, { color: themeColors.primary }]}>
                          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: themeColors.text }]}>{student.name || "Student"}</Text>
                      <Text style={[styles.studentEmail, { color: themeColors.muted }]}>{student.email}</Text>
                    </View>
                    <IconSymbol name="plus" size={24} color={themeColors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  countMeta: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 2,
  },
  eventImage: {
    borderRadius: 16,
    height: '100%',
    width: '100%',
  },
  eventImageButton: {
    borderRadius: 16,
    height: 240,
    marginBottom: spacing.md,
    overflow: 'hidden',
    width: '100%',
  },
  imageOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 18,
    bottom: spacing.sm,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    width: 36,
  },
  statusMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 6,
  },
  description: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 24,
    marginTop: spacing.md,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  heroText: {
    flex: 1,
    marginRight: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 14,
    marginBottom: 4,
  },
  pills: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 23,
    marginBottom: spacing.sm,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  registrationPanel: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  registrationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  regCol: {
    flex: 1,
  },
  regDivider: {
    backgroundColor: colors.border,
    height: 40,
    width: 1,
  },
  regLabel: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 11,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  regValue: {
    color: colors.primary,
    fontFamily: typography.bold,
    fontSize: 18,
    lineHeight: 24,
  },
  regPaused: {
    color: colors.text,
  },
  disabledAction: {
    opacity: 0.6,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalHeader: {
    alignItems: 'flex-end',
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  modalIconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  previewActions: {
    bottom: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    position: 'absolute',
  },
  previewActionButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  previewActionText: {
    color: colors.white,
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  previewImage: {
    height: '78%',
    width: '100%',
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
    padding: spacing.lg,
  },
  modalHeaderModal: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitleModal: {
    fontFamily: typography.bold,
    fontSize: 20,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSearchBox: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: typography.medium,
    fontSize: 15,
  },
  studentList: {
    flex: 1,
  },
  studentItem: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  studentAvatar: {
    borderRadius: 22,
    height: 44,
    width: 44,
  },
  studentAvatarFallback: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  studentAvatarText: {
    fontFamily: typography.semiBold,
    fontSize: 18,
  },
  studentInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  studentName: {
    fontFamily: typography.semiBold,
    fontSize: 16,
  },
  studentEmail: {
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 2,
  },
  noStudentsText: {
    fontFamily: typography.medium,
    fontSize: 15,
    paddingVertical: spacing.xl,
    textAlign: 'center',
  },
});
