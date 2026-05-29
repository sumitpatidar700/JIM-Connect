import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import { BackButton } from '@/components/ui/BackButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Panel } from '@/components/ui/Panel';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { queryKeys } from '@/src/hooks/queries/query-keys';
import { useEventByIdQuery } from '@/src/hooks/queries/useEventByIdQuery';
import { useAppFeedback } from '@/src/providers/app-feedback-provider';
import { authService } from '@/src/services/auth-service';
import { eventService } from '@/src/services/event-service';
import { useAuthStore } from '@/src/store/auth-store';
import { colors, spacing, typography } from '@/src/theme/tokens';
import { UserProfile } from '@/src/types/app';
import { formatEventDate } from '@/src/utils/format';
import { getRegistrationState } from '@/src/utils/registration-status';
import { useThemeColors } from '@/src/utils/settings-effects';
import { useRegistrationCountsQuery } from '@/src/hooks/queries/useRegistrationCountsQuery';

export default function RegistrationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const themeColors = useThemeColors();
  const { showAlert } = useAppFeedback();
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((state) => state.profile);
  const userId = profile?.id;
  const isAdmin = profile?.role === 'admin';
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [teamName, setTeamName] = useState("");
  const [invites, setInvites] = useState<string[]>([""]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<UserProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const eventId = id ?? '';
  const { data: event = null, isLoading: loading } = useEventByIdQuery(eventId);
  const isTeamEvent = (event?.max_team_size ?? 1) > 1;

  const { data: allUsers = [] } = useQuery({
    queryKey: ["users", "list"],
    queryFn: () => authService.listUsers(),
    enabled: isTeamEvent,
  });

  const registrationState = event
    ? getRegistrationState(event, { closed: "#DC2626", open: "#16A34A" })
    : null;

  const { data: registrationCounts = {} } = useRegistrationCountsQuery(
    eventId ? [eventId] : [],
  );
  const registrationCount = registrationCounts[eventId] ?? 0;
  const isAtCapacity = event?.max_registrations ? registrationCount >= event.max_registrations : false;
  const seatsLeft = event?.max_registrations ? Math.max(0, event.max_registrations - registrationCount) : null;
  const canRegister = Boolean(registrationState?.isOpen) && !isAtCapacity;

  const currentTeamSize = 1 + selectedStudents.length + invites.filter(i => i.trim()).length;

  const handleAddInviteField = () => {
    if (event && currentTeamSize < event.max_team_size) {
      setInvites([...invites, ""]);
    }
  };

  const handleUpdateInvite = (index: number, val: string) => {
    const updated = [...invites];
    updated[index] = val;
    setInvites(updated);
  };

  const handleSelectStudent = (student: UserProfile) => {
    if (event && currentTeamSize >= event.max_team_size) {
      showAlert({
        message: `Maximum team size is ${event.max_team_size} members.`,
        title: "Team is full",
        tone: "warning",
      });
      return;
    }
    if (!selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents([...selectedStudents, student]);
    }
    setShowStudentModal(false);
    setStudentSearch("");
  };

  const handleRemoveStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  const availableStudents = allUsers.filter(u => {
    if (u.id === userId || u.role === 'admin' || selectedStudents.some(s => s.id === u.id)) {
      return false;
    }
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.name, u.email, u.phone].filter(Boolean).some(val => val?.toLowerCase().includes(q));
  });

  const handleRegister = async () => {
    if (!userId || !eventId) {
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length !== 10) {
      await showAlert({
        message: "Enter a valid 10 digit phone number.",
        title: "Phone number required",
        tone: "warning",
      });
      return;
    }

    if (isTeamEvent && !teamName.trim()) {
      await showAlert({
        message: "Please enter a unique group or team name.",
        title: "Group Name Required",
        tone: "warning",
      });
      return;
    }

    if (isTeamEvent && event && currentTeamSize < event.min_team_size) {
      await showAlert({
        message: `This group event requires a minimum of ${event.min_team_size} members. You currently have ${currentTeamSize}.`,
        title: "Minimum Members Required",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (isTeamEvent) {
        const allInvitedIdsOrPhones = [
          ...invites.filter(val => val.trim()),
          ...selectedStudents.map(s => s.id)
        ];
        await eventService.registerTeamForEvent(userId, eventId, teamName, normalizedPhone, allInvitedIdsOrPhones);
      } else {
        await eventService.registerForEvent(userId, eventId, normalizedPhone);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.registeredEvents(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userRegistrations(userId) }),
        queryClient.invalidateQueries({ queryKey: ['registrations', 'counts'] }),
      ]);
      await showAlert({
        message: isTeamEvent ? 'Your group has been successfully registered and invitations sent.' : 'Your seat has been reserved.',
        title: 'Registration successful',
        tone: 'success',
      });
      router.replace('/(app)/(tabs)/events');
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.details ||
        error?.hint ||
        (typeof error === "string" ? error : "Registration failed. Please verify your details.");
      await showAlert({
        message: errorMessage,
        title: 'Registration failed',
        tone: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState fullScreen message="Preparing registration..." />;
  }

  if (!event) {
    return (
      <Screen>
        <BackButton fallbackHref="/(app)/(tabs)/events" />
        <EmptyState message="This event is no longer available." title="Unable to register" />
      </Screen>
    );
  }

  if (isAdmin) {
    return (
      <Screen>
        <BackButton fallbackHref={{ pathname: '/(app)/events/[id]', params: { id: id ?? '' } }} />
        <EmptyState
          message="Admin accounts manage events and view registrations, but cannot register for events."
          title="Admin registration disabled"
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <BackButton fallbackHref={{ pathname: '/(app)/events/[id]', params: { id: id ?? '' } }} />
      <Panel style={styles.card}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          {isTeamEvent ? "Confirm Group / Team Registration" : "Confirm registration"}
        </Text>
        <Text style={[styles.eventTitle, { color: themeColors.text }]}>{event.title}</Text>
        <Text style={[styles.meta, { color: themeColors.muted }]}>{formatEventDate(event.date)}</Text>
        <Text style={[styles.meta, { color: themeColors.muted }]}>{event.venue}</Text>
        {isTeamEvent ? (
          <Text style={[styles.meta, { color: themeColors.primary, marginTop: 4, fontFamily: typography.semiBold }]}>
            Group Size: {event.min_team_size} - {event.max_team_size} members
          </Text>
        ) : null}
        <Text
          style={[
            styles.status,
            { color: registrationState?.borderColor ?? themeColors.primary },
          ]}
        >
          {registrationState?.label}
        </Text>
      </Panel>
      <Panel style={styles.card}>
        <Text style={[styles.title, { color: themeColors.text }]}>Contact number</Text>
        <Text style={[styles.meta, { color: themeColors.muted }]}>
          Admins will use this number only for event coordination.
        </Text>
        <TextField
          autoComplete="tel"
          keyboardType="number-pad"
          label="10 digit phone number"
          maxLength={10}
          placeholder="9876543210"
          textContentType="telephoneNumber"
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
        />
      </Panel>

      {isTeamEvent ? (
        <Panel style={styles.card}>
          <Text style={[styles.title, { color: themeColors.text }]}>Group / Team Information</Text>
          <TextField
            label="Group or Team Name *"
            placeholder="e.g. Code Crafters"
            value={teamName}
            onChangeText={setTeamName}
          />

          <Text style={[styles.meta, { marginTop: 16, marginBottom: 8, color: themeColors.muted }]}>
            Team Members ({currentTeamSize} / {event.max_team_size})
          </Text>

          <View style={styles.selectedChipsContainer}>
            <View style={[styles.selectedChip, { backgroundColor: themeColors.primary }]}>
              <Text style={[styles.selectedChipText, { color: colors.white }]}>You (Leader)</Text>
            </View>
            {selectedStudents.map((s) => (
              <View key={s.id} style={[styles.selectedChip, { backgroundColor: themeColors.primarySoft }]}>
                <Text style={[styles.selectedChipText, { color: themeColors.primary }]}>{s.name || s.email}</Text>
                <TouchableOpacity onPress={() => handleRemoveStudent(s.id)} style={{ marginLeft: 6 }}>
                  <IconSymbol name="close" size={16} color={themeColors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {currentTeamSize < event.max_team_size ? (
            <PrimaryButton
              label="+ Select Teammates from Directory"
              onPress={() => setShowStudentModal(true)}
              variant="secondary"
              icon="people-outline"
              style={{ marginTop: 8, marginBottom: 16 }}
            />
          ) : null}

          <Text style={[styles.meta, { marginTop: 8, marginBottom: 8, color: themeColors.muted }]}>
            Or Invite Teammates by Email or Phone (Optional)
          </Text>
          {invites.map((inviteVal, index) => (
            <TextField
              key={index}
              label={`External Teammate ${index + 1} Email or Phone`}
              placeholder="student@example.com or 9876543210"
              value={inviteVal}
              onChangeText={(val) => handleUpdateInvite(index, val)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ))}
          {currentTeamSize < event.max_team_size ? (
            <PrimaryButton
              label="+ Add Manual Invite Field"
              onPress={handleAddInviteField}
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          ) : null}
        </Panel>
      ) : null}

      {isTeamEvent && event && currentTeamSize < event.min_team_size ? (
        <Text style={{ color: "#EF4444", fontSize: 13, fontFamily: typography.medium, textAlign: "center", marginBottom: 12 }}>
          ⚠️ Please add at least {event.min_team_size - currentTeamSize} more member(s) to reach the minimum group size ({event.min_team_size}).
        </Text>
      ) : null}

      {isAtCapacity ? (
        <View style={{ backgroundColor: "#FEF2F2", borderColor: "#F87171", borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontFamily: typography.bold, color: "#991B1B" }}>Event Full</Text>
            <Text style={{ fontSize: 13, color: "#B91C1C", marginTop: 2 }}>This event has reached its capacity ({event?.max_registrations} seats). No further registrations can be accepted.</Text>
          </View>
        </View>
      ) : null}

      <PrimaryButton
        disabled={submitting || !canRegister || phone.replace(/\D/g, "").length !== 10 || (isTeamEvent && (!teamName.trim() || !event || currentTeamSize < event.min_team_size))}
        loading={submitting}
        label={
          submitting
            ? 'Registering...'
            : isAtCapacity
              ? 'Event Full (0 Seats Left)'
              : canRegister
                ? isTeamEvent ? 'Confirm Group Registration' : 'Confirm Registration'
                : 'Registration Closed'
        }
        onPress={handleRegister}
      />

      <Modal
        visible={showStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStudentModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowStudentModal(false)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <IconSymbol name="chevron.left" size={24} color={themeColors.primary} />
                <Text style={{ fontFamily: typography.semiBold, fontSize: 16, color: themeColors.primary }}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Teammate</Text>
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
                    onPress={() => handleSelectStudent(student)}
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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        <Text style={[styles.studentEmail, { color: themeColors.muted, marginTop: 0 }]}>{student.email}</Text>
                        {student.batch_name && (
                          <View style={{ backgroundColor: `${themeColors.primary}15`, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 }}>
                            <Text style={{ fontSize: 9, fontFamily: typography.semiBold, color: themeColors.primary }}>
                              {student.batch_name}
                            </Text>
                          </View>
                        )}
                      </View>
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
  card: {
    marginBottom: spacing.lg,
  },
  eventTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  meta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    marginBottom: 4,
  },
  status: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
    marginBottom: spacing.md,
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
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
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
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  selectedChip: {
    alignItems: 'center',
    borderRadius: 18,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectedChipText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
});
