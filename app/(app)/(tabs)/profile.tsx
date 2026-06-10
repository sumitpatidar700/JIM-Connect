import { IconSymbol } from "@/components/ui/icon-symbol";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  View,
} from "react-native";

import { CustomPhotoEditorModal } from "@/components/ui/CustomPhotoEditorModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { SupportSection } from "@/components/ui/SupportSection";
import { TextField } from "@/components/ui/TextField";
import { useUserRegistrationsQuery } from "@/src/hooks/queries/useUserRegistrationsQuery";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { authService } from "@/src/services/auth-service";
import { eventService } from "@/src/services/event-service";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, spacing, typography } from "@/src/theme/tokens";
import { UserProfile } from "@/src/types/app";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function ProfileScreen() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAppFeedback();
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === "admin";
  const session = useAuthStore((state) => state.session);
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const [signingOut, setSigningOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.name ?? "");
  const [profilePhone, setProfilePhone] = useState(profile?.phone ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAllRegistrations, setShowAllRegistrations] = useState(false);
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [regSortOption, setRegSortOption] = useState<"date_desc" | "date_asc" | "title">("date_desc");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [invitingTeamId, setInvitingTeamId] = useState<string | null>(null);
  const [inviteeInput, setInviteeInput] = useState("");
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [rawImageUri, setRawImageUri] = useState("");
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [uploadingGroupImg, setUploadingGroupImg] = useState(false);
  const queryClient = useQueryClient();
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const { data: registrations = [], isLoading } = useUserRegistrationsQuery(
    profile?.id,
  );
  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ["pendingInvites", profile?.id],
    queryFn: () => eventService.listPendingInvites(profile?.id as string),
    enabled: Boolean(profile?.id && !isAdmin),
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () => authService.listUsers(),
  });
  const [showDirectoryModalForTeam, setShowDirectoryModalForTeam] = useState<{ eventId: string; teamId: string; currentMembers: string[] } | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const availableStudents = allUsers.filter(u => {
    if (u.id === profile?.id || u.role === 'admin' || (showDirectoryModalForTeam?.currentMembers ?? []).includes(u.id)) {
      return false;
    }
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.email, u.phone].filter(Boolean).some(val => val?.toLowerCase().includes(q));
  });

  const handleSelectStudentFromDirectory = async (student: UserProfile, eventId: string, teamId: string) => {
    if (!student.id) return;
    try {
      setSubmittingInvite(true);
      await eventService.addTeamMember(eventId, teamId, profile?.id ?? "", student.id);
      setShowDirectoryModalForTeam(null);
      setStudentSearch("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(profile?.id) });
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
  const processedRegistrations = useMemo(() => {
    let result = [...registrations];

    if (regSearchQuery.trim()) {
      const q = regSearchQuery.trim().toLowerCase();
      result = result.filter(reg => {
        const title = reg.events?.title?.toLowerCase() || "";
        const venue = reg.events?.venue?.toLowerCase() || "";
        return title.includes(q) || venue.includes(q);
      });
    }

    result.sort((a, b) => {
      if (regSortOption === "date_desc") {
        const dateA = new Date(a.events?.date || 0).getTime();
        const dateB = new Date(b.events?.date || 0).getTime();
        return dateB - dateA;
      } else if (regSortOption === "date_asc") {
        const dateA = new Date(a.events?.date || 0).getTime();
        const dateB = new Date(b.events?.date || 0).getTime();
        return dateA - dateB;
      } else if (regSortOption === "title") {
        const titleA = a.events?.title || "";
        const titleB = b.events?.title || "";
        return titleA.localeCompare(titleB);
      }
      return 0;
    });

    return result;
  }, [registrations, regSearchQuery, regSortOption]);

  const visibleRegistrations = showAllRegistrations
    ? processedRegistrations
    : processedRegistrations.slice(0, 5);
  const hasHiddenRegistrations =
    processedRegistrations.length > visibleRegistrations.length;

  const handleRemoveTeammate = async (regId: string, memberName: string) => {
    const confirmed = await showConfirm({
      title: "Remove Teammate",
      message: `Are you sure you want to remove ${memberName} from the group?`,
      confirmLabel: "Remove",
      tone: "warning"
    });

    if (!confirmed) return;

    try {
      await eventService.removeTeamMember(regId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(profile?.id) });
      await showAlert({
        title: "Teammate Removed",
        message: `${memberName} has been removed from the group.`,
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

  const handleInviteAdditional = async (eventId: string, teamId: string) => {
    if (!inviteeInput.trim()) return;

    try {
      setSubmittingInvite(true);
      await eventService.addTeamMember(eventId, teamId, profile?.id ?? "", inviteeInput);
      setInviteeInput("");
      setInvitingTeamId(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(profile?.id) });
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

  const handleChooseGroupImage = async (teamId: string) => {
    try {
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      let permission = currentPermission;

      if (!permission.granted && permission.canAskAgain) {
        permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permission.granted) {
        await showAlert({
          message: "Allow media access to pick a group profile image.",
          title: "Permission needed",
          tone: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingGroupImg(true);
        await eventService.updateTeamImage(teamId, result.assets[0].uri);
        await queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(profile?.id) });
        await queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(profile?.id) });
        await showAlert({
          title: "Group image updated",
          message: "Your group profile image has been successfully updated!",
          tone: "success",
        });
      }
    } catch (error: any) {
      await showAlert({
        title: "Upload failed",
        message: error?.message || "Could not upload group image.",
        tone: "error",
      });
    } finally {
      setUploadingGroupImg(false);
    }
  };

  const handleInviteResponse = async (id: string, accept: boolean) => {
    try {
      await eventService.respondToTeamInvite(id, accept);
      await Promise.all([
        refetchInvites(),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(profile?.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(profile?.id) }),
      ]);
      await showAlert({
        message: accept ? "You have successfully joined the group!" : "Invitation declined.",
        title: accept ? "Group Accepted" : "Declined",
        tone: accept ? "success" : "default",
      });
    } catch (error: any) {
      await showAlert({
        message: error?.message || "Could not process invitation response.",
        title: "Error",
        tone: "error",
      });
    }
  };

  useEffect(() => {
    setProfileName(profile?.name ?? "");
    setProfilePhone(profile?.phone ?? "");
  }, [profile?.name, profile?.phone]);

  const handleSignOut = async () => {
    const confirmed = await showConfirm({
      confirmLabel: "Sign Out",
      message: "You will be returned to the login screen.",
      title: "Sign out now?",
      tone: "warning",
    });

    if (!confirmed) {
      return;
    }

    try {
      setSigningOut(true);
      await authService.signOut();
      router.replace("/(auth)/login");
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to sign out",
        tone: "error",
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleGallery = async () => {
    const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        await showAlert({
          message: "Photo access is blocked. Open device settings and allow media access.",
          title: "Permission blocked",
          tone: "warning",
        });
        await Linking.openSettings();
        return;
      }
      await showAlert({
        message: "Allow media access to add your profile photo.",
        title: "Permission needed",
        tone: "warning",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ["images"],
      quality: 1.0,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setRawImageUri(result.assets[0].uri);
      setShowPhotoEditor(true);
    }
  };

  const handleCamera = async () => {
    const currentPermission = await ImagePicker.getCameraPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        await showAlert({
          message: "Camera access is blocked. Open device settings and allow camera access.",
          title: "Permission blocked",
          tone: "warning",
        });
        await Linking.openSettings();
        return;
      }
      await showAlert({
        message: "Allow camera access to take a profile photo.",
        title: "Permission needed",
        tone: "warning",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ["images"],
      quality: 1.0,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setRawImageUri(result.assets[0].uri);
      setShowPhotoEditor(true);
    }
  };

  const uploadEditedPhoto = async (uri: string) => {
    try {
      setUploadingAvatar(true);
      const newAvatar = await authService.updateAvatar(profile?.id ?? "", uri);
      if (profile) {
        setAuthState({ profile: { ...profile, avatar_url: newAvatar }, session });
      }
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Unable to update photo",
        title: "Upload failed",
        tone: "error",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePhotoOption = () => {
    Alert.alert(
      "Profile Photo",
      "Select how you would like to add your photo",
      [
        { text: "Take Photo", onPress: () => void handleCamera() },
        { text: "Choose from Gallery", onPress: () => void handleGallery() },
        profile?.avatar_url
          ? {
              text: "Remove Photo",
              style: "destructive",
              onPress: async () => {
                try {
                  setUploadingAvatar(true);
                  await authService.updateAvatar(profile?.id ?? "", "");
                  if (profile) {
                    setAuthState({ profile: { ...profile, avatar_url: "" }, session });
                  }
                } catch (error) {
                  await showAlert({
                    message: "Unable to remove photo",
                    title: "Removal failed",
                    tone: "error",
                  });
                } finally {
                  setUploadingAvatar(false);
                }
              },
            }
          : undefined,
        { text: "Cancel", style: "cancel" },
      ].filter(Boolean) as any
    );
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const updatedProfile = await authService.updateProfile({
        name: profileName,
        phone: profilePhone,
        userId: profile?.id ?? "",
      });
      setAuthState({ profile: updatedProfile, session });
      setEditingProfile(false);
      await showAlert({
        message: t("profileSavedMessage"),
        title: t("profileSaved"),
        tone: "success",
      });
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: t("unableToSaveProfile"),
        tone: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfileEdit = () => {
    setProfileName(profile?.name ?? "");
    setProfilePhone(profile?.phone ?? "");
    setEditingProfile(false);
  };

  if (isLoading) {
    return <LoadingState fullScreen message="Loading your profile..." />;
  }

  return (
    <>
      <CustomPhotoEditorModal
        visible={showPhotoEditor}
        rawUri={rawImageUri}
        onCancel={() => setShowPhotoEditor(false)}
        onSave={(editedUri) => {
          setShowPhotoEditor(false);
          void uploadEditedPhoto(editedUri);
        }}
      />
      <Screen scrollable>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: themeColors.text }]}>{t("account")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pill
              label={profile?.role === "admin" ? "Admin" : "Student"}
              tone="dark"
            />
            <TouchableOpacity
              onPress={handleSignOut}
              disabled={signingOut}
              style={{ padding: 8, backgroundColor: "#FEE2E2", borderRadius: 20 }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.screenSubtitle, { color: themeColors.muted }]}>
          {t("accountIntro")}
        </Text>
      </View>

      <Panel style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarColumn}>
            <Pressable
              disabled={uploadingAvatar}
              onPress={handlePhotoOption}
              style={({ pressed }) => [
                styles.avatarPressable,
                pressed && styles.menuRowPressed,
                uploadingAvatar && styles.uploadingAvatar,
              ]}
            >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: themeColors.primary },
                ]}
              >
                <Text style={styles.avatarText}>
                  {getInitials(profile?.name)}
                </Text>
              </View>
            )}
              <View
                style={[
                  styles.cameraBadge,
                  {
                    backgroundColor: themeColors.primary,
                    borderColor: themeColors.surface,
                  },
                ]}
              >
                <Ionicons color={colors.white} name="camera" size={14} />
              </View>
              {uploadingAvatar ? (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator color={colors.white} size="small" />
                </View>
              ) : null}
            </Pressable>
          </View>
          <View style={styles.profileText}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: themeColors.text }]}>
                {profile?.name ?? "Campus Member"}
              </Text>
              <Pressable
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
                onPress={() => setEditingProfile((value) => !value)}
                style={({ pressed }) => [
                  styles.profileEditButton,
                  { backgroundColor: themeColors.primarySoft },
                  pressed && styles.menuRowPressed,
                ]}
              >
                <Ionicons color={themeColors.primary} name="pencil" size={15} />
              </Pressable>
            </View>
            <Text style={[styles.email, { color: themeColors.muted }]}>{profile?.email}</Text>
            {profile?.phone ? (
              <Text style={[styles.phone, { color: themeColors.muted }]}>{profile.phone}</Text>
            ) : null}
            <View style={styles.badges}>
              <Pill
                label={profile?.role === "admin" ? "Admin" : "Student"}
                tone="dark"
              />
            </View>
          </View>
        </View>
        {editingProfile ? (
          <View style={styles.profileForm}>
            <TextField
              autoCapitalize="words"
              autoComplete="name"
              label={t("fullName")}
              placeholder={t("fullName")}
              textContentType="name"
              value={profileName}
              onChangeText={setProfileName}
            />
            <TextField
              autoComplete="tel"
              keyboardType="phone-pad"
              label={t("phoneNumber")}
              placeholder={t("phoneNumber")}
              textContentType="telephoneNumber"
              value={profilePhone}
              onChangeText={(value) =>
                setProfilePhone(value.replace(/\D/g, "").slice(0, 10))
              }
            />
            <View style={styles.profileActions}>
              <PrimaryButton
                label={t("cancel")}
                onPress={handleCancelProfileEdit}
                style={styles.profileActionButton}
                variant="ghost"
              />
              <PrimaryButton
                disabled={
                  savingProfile ||
                  (!profileName.trim() && !profilePhone.trim()) ||
                  (profilePhone.trim() !== "" && profilePhone.trim().length !== 10) ||
                  (profileName.trim() === (profile?.name ?? "") &&
                    profilePhone.trim() === (profile?.phone ?? ""))
                }
                label={savingProfile ? t("saving") : t("save")}
                onPress={handleSaveProfile}
                style={styles.profileActionButton}
              />
            </View>
          </View>
        ) : null}
      </Panel>

      <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 0 }]}>{t("profileSettings")}</Text>
      <Panel style={styles.menuCard}>
        <MenuRow
          description={t("openProfileSettingsDescription")}
          icon="settings-outline"
          label={t("openProfileSettings")}
          onPress={() => router.push("/(app)/settings")}
        />
      </Panel>

      <SupportSection />


      {!isAdmin && pendingInvites.length > 0 ? (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary, marginBottom: 8 }]}>Pending Group / Team Invitations</Text>
          {pendingInvites.map((invite) => (
            <Panel key={invite.id} style={{ marginBottom: 12, borderColor: "#F59E0B", borderWidth: 1 }}>
              <Text style={{ fontFamily: typography.semiBold, fontSize: 16, color: themeColors.text }}>
                {invite.events?.title ?? "Campus Event"}
              </Text>
              <Text style={{ fontFamily: typography.regular, fontSize: 13, color: themeColors.muted, marginTop: 4, marginBottom: 12, lineHeight: 18 }}>
                You have been invited to partner up and join this event under group <Text style={{ fontFamily: typography.bold, color: themeColors.text }}>&quot;{invite.event_teams?.name}&quot;</Text>.
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: themeColors.surface, padding: 12, borderRadius: 12, marginBottom: 14, borderColor: themeColors.border, borderWidth: 1 }}>
                {invite.inviter?.avatar_url ? (
                  <Image source={{ uri: invite.inviter.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.primary }}>
                      {(invite.inviter?.name || "S")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: themeColors.muted, fontFamily: typography.medium }}>Invited by</Text>
                  <Text style={{ fontSize: 15, fontFamily: typography.bold, color: themeColors.text }}>
                    {invite.inviter?.name || "A teammate"}
                  </Text>
                  {invite.inviter?.email ? (
                    <Text style={{ fontSize: 12, color: themeColors.muted }}>{invite.inviter.email}</Text>
                  ) : null}
                </View>
              </View>

              {invite.event_teams?.registrations && invite.event_teams.registrations.length > 0 ? (
                <View style={{ marginBottom: 16, gap: 8 }}>
                  <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.muted }}>
                    Group Members in &quot;{invite.event_teams.name}&quot; ({invite.event_teams.registrations.length})
                  </Text>
                  {invite.event_teams.registrations.map((m: any) => {
                    const mName = m.users?.name || "Student";
                    const isLeaderMem = m.user_id === invite.event_teams?.leader_id;
                    const isSelf = m.user_id === profile?.id;
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

              <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                <PrimaryButton
                  label="Accept"
                  onPress={() => handleInviteResponse(invite.id, true)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label="Decline"
                  onPress={() => handleInviteResponse(invite.id, false)}
                  variant="secondary"
                  style={{ flex: 1 }}
                />
              </View>
            </Panel>
          ))}
        </View>
      ) : null}

      {isAdmin ? (
        <>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t("registeredEvents")}</Text>
        {registrations.length > 0 ? (
          <Text style={[styles.sectionCount, { color: themeColors.muted }]}>{registrations.length}</Text>
        ) : null}
      </View>
      {registrations.length > 0 ? (
        <View style={{ gap: 12, marginTop: 8, marginBottom: 16 }}>
          <TextField
            placeholder="Search registered events or venues..."
            value={regSearchQuery}
            onChangeText={setRegSearchQuery}
            rightIcon={<IconSymbol name="magnifyingglass" size={20} color={themeColors.muted} />}
            label=""
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 12, fontFamily: typography.medium, color: themeColors.muted }}>Sort by:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <TouchableOpacity onPress={() => setRegSortOption("date_desc")} activeOpacity={0.8}>
                <Pill
                  label="Latest Date"
                  tone={regSortOption === "date_desc" ? "brand" : "default"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRegSortOption("date_asc")} activeOpacity={0.8}>
                <Pill
                  label="Earliest Date"
                  tone={regSortOption === "date_asc" ? "brand" : "default"}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRegSortOption("title")} activeOpacity={0.8}>
                <Pill
                  label="Event Title"
                  tone={regSortOption === "title" ? "brand" : "default"}
                />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      ) : null}
      {processedRegistrations.length === 0 && registrations.length > 0 ? (
        <EmptyState
          message="No registered events match your search."
          title={t("registeredEvents")}
        />
      ) : registrations.length === 0 ? (
        <EmptyState
          message={t("noRegisteredEvents")}
          title={t("registeredEvents")}
        />
      ) : (
        <View style={styles.registrationList}>
        {visibleRegistrations.map((registration) => (
          <Panel key={registration.id} style={styles.registrationCard}>
            <Text numberOfLines={1} style={[styles.registrationTitle, { color: themeColors.text }]}>
                {registration.events?.title ?? t("campusEvent")}
            </Text>
            <Text numberOfLines={1} style={[styles.registrationMeta, { color: themeColors.muted }]}>
              {[
                registration.events?.date
                  ? formatEventDate(registration.events.date)
                  : "Date TBD",
                registration.events?.venue ?? "Venue TBD",
              ].join(" • ")}
            </Text>
            {registration.event_teams?.name ? (
              <View style={{ marginTop: 8, borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 8 }}>
                <Pressable
                  onPress={() => setExpandedTeamId(expandedTeamId === registration.event_teams?.id ? null : (registration.event_teams?.id ?? null))}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ backgroundColor: "#3B82F620", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      {registration.event_teams?.image_url ? (
                        <Image source={{ uri: registration.event_teams.image_url! }} style={{ width: 14, height: 14, borderRadius: 7 }} />
                      ) : (
                        <IconSymbol name="people-outline" size={12} color="#3B82F6" />
                      )}
                      <Text style={{ fontSize: 11, color: "#3B82F6", fontFamily: typography.semiBold }}>Group: {registration.event_teams?.name}</Text>
                    </View>
                    {registration.status === 'pending' ? (
                      <View style={{ backgroundColor: "#F59E0B20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, color: "#F59E0B", fontFamily: typography.semiBold }}>Pending Invite</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: "#10B98120", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                        <Text style={{ fontSize: 11, color: "#10B981", fontFamily: typography.semiBold }}>Accepted</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 12, color: themeColors.primary, fontFamily: typography.medium }}>
                      {expandedTeamId === registration.event_teams?.id ? "Hide members" : "View members"}
                    </Text>
                    <IconSymbol name={expandedTeamId === registration.event_teams?.id ? "chevron-up" : "chevron-down"} size={14} color={themeColors.primary} />
                  </View>
                </Pressable>
 
                {expandedTeamId === registration.event_teams?.id && registration.event_teams?.registrations ? (
                  <View style={{ marginTop: 8, gap: 8, padding: 12, borderRadius: 12, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, borderBottomColor: themeColors.border, borderBottomWidth: 1, paddingBottom: 10 }}>
                      <Pressable
                        disabled={profile?.id !== registration.event_teams?.leader_id || uploadingGroupImg}
                        onPress={() => registration.event_teams?.id && handleChooseGroupImage(registration.event_teams.id)}
                        style={({ pressed }) => [
                          {
                            position: "relative",
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            overflow: "hidden",
                            backgroundColor: themeColors.primarySoft,
                            alignItems: "center",
                            justifyContent: "center",
                            borderColor: themeColors.border,
                            borderWidth: 1,
                          },
                          pressed && { opacity: 0.8 }
                        ]}
                      >
                        {registration.event_teams?.image_url ? (
                          <Image source={{ uri: registration.event_teams.image_url! }} style={{ width: 44, height: 44 }} />
                        ) : (
                          <IconSymbol name="people-outline" size={20} color={themeColors.primary} />
                        )}
                        {profile?.id === registration.event_teams?.leader_id && (
                          <View style={{ position: "absolute", bottom: 0, right: 0, left: 0, backgroundColor: "rgba(0,0,0,0.5)", height: 14, alignItems: "center", justifyContent: "center" }}>
                            <IconSymbol name="camera" size={8} color="#fff" />
                          </View>
                        )}
                        {uploadingGroupImg && (
                          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
                            <ActivityIndicator size="small" color="#fff" />
                          </View>
                        )}
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontFamily: typography.bold, color: themeColors.text }} numberOfLines={1}>{registration.event_teams?.name}</Text>
                        <Text style={{ fontSize: 11, fontFamily: typography.medium, color: themeColors.muted }}>
                          {profile?.id === registration.event_teams?.leader_id ? "You are the Team Leader" : "Team Member"}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.muted, marginBottom: 2 }}>
                      Group Teammates ({registration.event_teams?.registrations?.length ?? 0})
                    </Text>
                    {registration.event_teams!.registrations.map((m, index) => {
                      const mName = m.users?.name || "Student";
                      const isLeader = m.user_id === registration.event_teams?.leader_id;
                      const isSelf = m.user_id === profile?.id;
                      const isCurrentUserLeader = profile?.id === registration.event_teams?.leader_id;
                      const canRemove = isCurrentUserLeader && !isSelf;
                      const st = m.status ?? 'accepted';
                      const isLast = index === (registration.event_teams?.registrations?.length ?? 1) - 1;

                      return (
                        <View key={m.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomColor: isLast ? "transparent" : themeColors.border, borderBottomWidth: isLast ? 0 : 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {m.users?.avatar_url ? (
                              <Image source={{ uri: m.users.avatar_url }} style={{ width: 28, height: 28, borderRadius: 14 }} />
                            ) : (
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{getInitials(mName)}</Text>
                              </View>
                            )}
                            <View>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text }}>
                                  {mName} {isSelf ? "(You)" : ""}
                                </Text>
                                {isLeader ? <View style={{ backgroundColor: "#3B82F6", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}><Text style={{ color: "#fff", fontSize: 9, fontFamily: typography.semiBold }}>Leader</Text></View> : null}
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

                    {profile?.id === registration.event_teams?.leader_id && registration.events && (registration.events.max_team_size ?? 1) > (registration.event_teams?.registrations?.length ?? 0) ? (
                      <View style={{ marginTop: 8, borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 10 }}>
                        {invitingTeamId === registration.event_teams?.id ? (
                          <View style={{ gap: 8 }}>
                            <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.text }}>
                              Invite Teammate ({(registration.event_teams?.registrations?.length ?? 0)}/{registration.events.max_team_size} slots filled)
                            </Text>
                            <TextField
                              label="Student Email or Phone Number"
                              placeholder="Enter student email or phone number"
                              value={inviteeInput}
                              onChangeText={setInviteeInput}
                              autoCapitalize="none"
                              autoCorrect={false}
                            />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <PrimaryButton
                                label="Cancel"
                                onPress={() => { setInvitingTeamId(null); setInviteeInput(""); }}
                                variant="ghost"
                                style={{ flex: 1 }}
                              />
                              <PrimaryButton
                                label={submittingInvite ? "Inviting..." : "Send Invite"}
                                onPress={() => handleInviteAdditional(registration.event_id, registration.event_teams!.id)}
                                disabled={submittingInvite || !inviteeInput.trim()}
                                loading={submittingInvite}
                                style={{ flex: 1 }}
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={{ gap: 10 }}>
                            <PrimaryButton
                              label={`+ Select Teammate from Directory (${(registration.events.max_team_size ?? 1) - (registration.event_teams?.registrations?.length ?? 0)} available)`}
                              onPress={() => setShowDirectoryModalForTeam({
                                eventId: registration.event_id,
                                teamId: registration.event_teams!.id,
                                currentMembers: registration.event_teams?.registrations?.map((r) => r.user_id) ?? []
                              })}
                              variant="secondary"
                              icon="people-outline"
                            />
                            <PrimaryButton
                              label="+ Invite by Email"
                              onPress={() => setInvitingTeamId(registration.event_teams!.id)}
                              variant="ghost"
                            />
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
          </Panel>
        ))}
        {hasHiddenRegistrations || showAllRegistrations ? (
          <Pressable
            onPress={() => setShowAllRegistrations((value) => !value)}
            style={({ pressed }) => [
              styles.viewAllButton,
              pressed && styles.menuRowPressed,
            ]}
          >
            <Text style={[styles.viewAllText, { color: themeColors.primary }]}>
              {showAllRegistrations
                ? t("showLess")
                : t("viewAllEvents", { count: processedRegistrations.length })}
            </Text>
            <Ionicons
              color={themeColors.primary}
              name={showAllRegistrations ? "chevron-up" : "chevron-down"}
              size={18}
            />
          </Pressable>
        ) : null}
        </View>
      )}
      </>
      ) : null}

      <View style={styles.signOutWrap}>
        <PrimaryButton
          disabled={signingOut}
          icon="rectangle.portrait.and.arrow.right"
          label={signingOut ? "Signing Out..." : "Sign Out"}
          onPress={handleSignOut}
          variant="secondary"
        />
      </View>

      <Modal
        visible={Boolean(showDirectoryModalForTeam)}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDirectoryModalForTeam(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeaderModal}>
              <TouchableOpacity onPress={() => setShowDirectoryModalForTeam(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <IconSymbol name="chevron.left" size={24} color={themeColors.primary} />
                <Text style={{ fontFamily: typography.semiBold, fontSize: 16, color: themeColors.primary }}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitleModal, { color: themeColors.text }]}>Select Teammate</Text>
              <TouchableOpacity onPress={() => setShowDirectoryModalForTeam(null)} style={styles.modalCloseButton}>
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
                    onPress={() => handleSelectStudentFromDirectory(student, showDirectoryModalForTeam?.eventId ?? "", showDirectoryModalForTeam?.teamId ?? "")}
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
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: Platform.OS === "android" ? 32 : 36,
    height: Platform.OS === "android" ? 64 : 72,
    width: Platform.OS === "android" ? 64 : 72,
  },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: Platform.OS === "android" ? 32 : 36,
    height: Platform.OS === "android" ? 64 : 72,
    justifyContent: "center",
    width: Platform.OS === "android" ? 64 : 72,
  },
  avatarText: {
    color: colors.white,
    fontFamily: typography.bold,
    fontSize: Platform.OS === "android" ? 18 : 22,
  },
  avatarColumn: {
    alignItems: "center",
    gap: spacing.xs,
  },
  avatarLoadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: Platform.OS === "android" ? 32 : 36,
    bottom: 0,
    height: Platform.OS === "android" ? 64 : 72,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: Platform.OS === "android" ? 64 : 72,
  },
  avatarPressable: {
    position: "relative",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  email: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderRadius: 13,
    borderWidth: 2,
    bottom: -2,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 26,
  },
  name: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 18,
    flex: 1,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: 0,
  },
  profileCard: {
    marginBottom: spacing.md,
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  phone: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  profileActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  profileActionButton: {
    flex: 1,
  },
  profileEditButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  profileForm: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  profileText: {
    flex: 1,
  },
  menuCard: {
    marginBottom: spacing.md,
    paddingVertical: 0,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  menuLabel: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: Platform.OS === "android" ? 14 : 15,
    marginBottom: 2,
  },
  menuDescription: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  menuRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuRowPressed: {
    opacity: 0.75,
  },
  menuText: {
    flex: 1,
  },
  registrationCard: {
    borderRadius: 18,
    marginBottom: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  registrationList: {
    gap: 12,
  },
  registrationMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  registrationTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: Platform.OS === "android" ? 14 : 15,
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: 0,
  },
  sectionCount: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
  },
  screenTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: Platform.OS === "android" ? 20 : 24,
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  screenSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  signOutWrap: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  viewAllButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  uploadingAvatar: {
    opacity: 0.55,
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

function getInitials(name?: string | null) {
  const parts = name?.trim().split(" ").filter(Boolean) ?? [];
  if (parts.length === 0) {
    return "JC";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MenuRow({
  description,
  icon,
  label,
  onPress,
}: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const themeColors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        pressed && styles.menuRowPressed,
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: themeColors.primarySoft }]}>
        <Ionicons color={themeColors.primary} name={icon} size={22} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, { color: themeColors.text }]}>{label}</Text>
        <Text style={[styles.menuDescription, { color: themeColors.muted }]}>
          {description}
        </Text>
      </View>
      <Ionicons color={themeColors.muted} name="chevron-forward" size={20} />
    </Pressable>
  );
}
