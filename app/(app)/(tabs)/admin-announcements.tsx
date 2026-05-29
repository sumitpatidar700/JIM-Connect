import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { useAnnouncementsQuery } from "@/src/hooks/queries/useAnnouncementsQuery";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { announcementService } from "@/src/services/announcement-service";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { Announcement } from "@/src/types/app";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";

const TITLE_LIMIT = 80;
const DESCRIPTION_LIMIT = 500;
type NoticeFilter = "all" | "week" | "month";
type NoticeSort = "newest" | "oldest" | "az";
type NoticeSection = "create" | "view";

const filterOptions: { label: string; value: NoticeFilter }[] = [
  { label: "All", value: "all" },
  { label: "7 days", value: "week" },
  { label: "30 days", value: "month" },
];

const sortOptions: { label: string; value: NoticeSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "A-Z", value: "az" },
];

export default function AdminAnnouncementsScreen() {
  const queryClient = useQueryClient();
  const { showAlert, showConfirm } = useAppFeedback();
  const profile = useAuthStore((state) => state.profile);
  const activeSession = useAuthStore((state) => state.activeSession);
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const batches = useAuthStore((state) => state.batches);
  const adminSelectedBatch = useAuthStore((state) => state.adminSelectedBatch);
  const setAdminSelectedBatch = useAuthStore((state) => state.setAdminSelectedBatch);
  const fetchBatches = useAuthStore((state) => state.fetchBatches);

  useState(() => {
    fetchBatches();
  });

  const {
    data: announcements = [],
    isLoading: loading,
    refetch: refetchAnnouncements,
  } = useAnnouncementsQuery();
  const [form, setForm] = useState({ description: "", id: "", title: "" });
  // Form always visible in create tab (no accordion)
  const [activeSection, setActiveSection] = useState<NoticeSection>("create");
  const [noticeFilter, setNoticeFilter] = useState<NoticeFilter>("all");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [noticeSort, setNoticeSort] = useState<NoticeSort>("newest");
  const [submitting, setSubmitting] = useState(false);

  const editingNotice = useMemo(
    () => announcements.find((item) => item.id === form.id),
    [announcements, form.id],
  );
  const trimmedTitle = form.title.trim();
  const trimmedDescription = form.description.trim();
  const hasChanges = useMemo(() => {
    if (!form.id) {
      return Boolean(trimmedTitle || trimmedDescription);
    }

    return (
      trimmedTitle !== editingNotice?.title ||
      trimmedDescription !== editingNotice?.description
    );
  }, [editingNotice?.description, editingNotice?.title, form.id, trimmedDescription, trimmedTitle]);
  const isFormReady = useMemo(
    () => Boolean(trimmedTitle && trimmedDescription && hasChanges),
    [hasChanges, trimmedDescription, trimmedTitle],
  );
  const hasFormValue = useMemo(
    () => Boolean(form.id || form.title.trim() || form.description.trim()),
    [form.description, form.id, form.title],
  );
  const visibleAnnouncements = useMemo(() => {
    const now = Date.now();
    const query = noticeSearch.trim().toLowerCase();

    return announcements
      .filter((announcement) => {
        if (query) {
          const searchable = `${announcement.title} ${announcement.description}`.toLowerCase();
          if (!searchable.includes(query)) {
            return false;
          }
        }

        if (noticeFilter === "all") {
          return true;
        }

        const createdAt = new Date(announcement.created_at).getTime();
        const maxAge = noticeFilter === "week" ? 7 : 30;
        return now - createdAt <= maxAge * 24 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        if (noticeSort === "az") {
          return a.title.localeCompare(b.title);
        }

        const first = new Date(a.created_at).getTime();
        const second = new Date(b.created_at).getTime();
        return noticeSort === "newest" ? second - first : first - second;
      });
  }, [announcements, noticeFilter, noticeSearch, noticeSort]);

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
    return <LoadingState fullScreen message="Loading announcement desk..." />;
  }

  const handleSave = async () => {
    if (!activeSession) {
      await showAlert({
        message: "You cannot publish notices without an active academic session. Please set one in Settings first.",
        title: "Publishing disabled",
        tone: "warning",
      });
      return;
    }

    if (!trimmedTitle || !trimmedDescription) {
      await showAlert({
        message: "Add both a title and description.",
        title: "Missing fields",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      if (form.id) {
        await announcementService.updateAnnouncement(form.id, {
          description: trimmedDescription,
          title: trimmedTitle,
        });
      } else {
        await announcementService.createAnnouncement({
          description: trimmedDescription,
          title: trimmedTitle,
          batch_id: adminSelectedBatch?.id ?? null,
        });
      }
      setForm({ description: "", id: "", title: "" });
      Keyboard.dismiss();
      await queryClient.invalidateQueries({ queryKey: queryKeys.announcements(adminSelectedBatch?.id ?? null) });
      await refetchAnnouncements();
      setActiveSection("view");
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ animated: true, y: 0 });
      });
    } catch (error: any) {
      const errorMessage =
        error?.message ||
        error?.details ||
        error?.hint ||
        (typeof error === "string" ? error : "An unexpected error occurred while communicating with the database.");
      await showAlert({
        message: errorMessage,
        title: "Unable to save notice",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = async () => {
    if (!hasFormValue) {
      return;
    }

    if (hasChanges) {
      const confirmed = await showConfirm({
        confirmLabel: form.id ? "Discard" : "Clear",
        message: form.id
          ? "Your edits to this notice will be discarded."
          : "This draft notice will be cleared.",
        title: form.id ? "Discard changes?" : "Clear draft?",
        tone: "warning",
      });
      if (!confirmed) {
        return;
      }
    }

    setForm({ description: "", id: "", title: "" });
  };

  const handleEditNotice = (announcement: Announcement) => {
    setForm({
      description: announcement.description,
      id: announcement.id,
      title: announcement.title,
    });
    setActiveSection("create");
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ animated: true, y: 0 });
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={styles.container}
    >
      <Screen
        contentContainerStyle={styles.screenContent}
        scrollRef={scrollRef}
        scrollable
      >
        <Text style={[styles.title, { color: themeColors.text }]}>{t("announcementDesk")}</Text>
        <Text style={[styles.subtitle, { color: themeColors.muted }]}>{t("announcementDeskIntro")}</Text>

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

        <View style={styles.tabsRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveSection("create")}
            style={[
              styles.tabButton,
              { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
              activeSection === "create" && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
            ]}
          >
            <Text style={[styles.tabText, { color: activeSection === "create" ? themeColors.white : themeColors.text }]}>
              {t("createNotice")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveSection("view")}
            style={[
              styles.tabButton,
              { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border },
              activeSection === "view" && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
            ]}
          >
            <Text style={[styles.tabText, { color: activeSection === "view" ? themeColors.white : themeColors.text }]}>
              {t("allNotices")}
            </Text>
          </Pressable>
        </View>

        {activeSection === "create" ? (
          <Panel style={[styles.section, styles.formSection]}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderText}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                  {form.id ? "Edit notice" : "Publish a new notice"}
                </Text>
                <Text style={[styles.formHint, { color: themeColors.muted }]}>
                  {form.id ? "Update and publish." : "Keep it short and useful."}
                </Text>
              </View>
              <View style={styles.formHeaderActions}>
                <View style={styles.noticeCountPill}>
                  <Text style={[styles.noticeCountText, { color: themeColors.primary }]}>
                    {announcements.length} live
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.formBody}>
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
                {form.id ? (
                  <View
                    style={[
                      styles.editingBanner,
                      {
                        backgroundColor: themeColors.primarySoft,
                        borderColor: themeColors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.editingText, { color: themeColors.primary }]}>
                      Editing notice from{" "}
                      {editingNotice?.created_at
                        ? formatEventDate(editingNotice.created_at)
                        : "the feed"}
                    </Text>
                  </View>
                ) : null}
                <TextField
                  autoCapitalize="sentences"
                  maxLength={TITLE_LIMIT}
                  label="Title"
                  placeholder="Lab closed on Friday"
                  value={form.title}
                  onChangeText={(title) =>
                    setForm((prev) => ({ ...prev, title: title.slice(0, TITLE_LIMIT) }))
                  }
                />
                <TextField
                  label="Description"
                  maxLength={DESCRIPTION_LIMIT}
                  multiline
                  placeholder="Add the full announcement body"
                  value={form.description}
                  onChangeText={(description) =>
                    setForm((prev) => ({
                      ...prev,
                      description: description.slice(0, DESCRIPTION_LIMIT),
                    }))
                  }
                />
                <View style={styles.fieldMetaRow}>
                  <Text style={styles.fieldHelp}>
                    {form.title.length}/{TITLE_LIMIT} title
                  </Text>
                  <Text style={styles.fieldCount}>
                    {form.description.length}/{DESCRIPTION_LIMIT} body
                  </Text>
                </View>
                <View style={styles.previewBox}>
                  <Text style={[styles.previewLabel, { color: themeColors.primary }]}>
                    Student feed preview
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.previewTitle,
                      !trimmedTitle && styles.previewPlaceholder,
                    ]}
                  >
                    {trimmedTitle || "Notice title"}
                  </Text>
                  <Text
                    numberOfLines={4}
                    style={[
                      styles.previewBody,
                      !trimmedDescription && styles.previewPlaceholder,
                    ]}
                  >
                    {trimmedDescription || "Announcement details will appear here."}
                  </Text>
                </View>
                <View style={styles.formActions}>
                  {form.id ? (
                    <PrimaryButton
                      disabled={!hasFormValue || submitting}
                      label="Cancel Edit"
                      onPress={handleResetForm}
                      variant="ghost"
                    />
                  ) : null}
                  <PrimaryButton
                    disabled={!isFormReady || submitting || !activeSession}
                    loading={submitting}
                    icon={form.id ? "checkmark" : undefined}
                    label={
                      submitting
                        ? form.id
                          ? "Updating..."
                          : "Publishing..."
                        : form.id
                          ? "Update Notice"
                          : "Publish Notice"
                    }
                    onPress={handleSave}
                  />
                </View>
              </View>
          </Panel>
        ) : null}

        {activeSection === "view" ? (
          <>
            <View style={styles.listHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t("allNotices")}</Text>
                <Text style={[styles.listMeta, { color: themeColors.muted }]}>
                  Showing {visibleAnnouncements.length} of {announcements.length}
                </Text>
              </View>
            </View>

            <Panel style={styles.toolbar}>
              <TextField
                autoCapitalize="none"
                autoCorrect={false}
                label="Search"
                placeholder="Search title or description"
                value={noticeSearch}
                onChangeText={setNoticeSearch}
              />
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Filter</Text>
                <View style={styles.chipRow}>
                  {filterOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setNoticeFilter(option.value)}
                      style={[
                        styles.controlChip,
                        noticeFilter === option.value && {
                          backgroundColor: themeColors.primary,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.controlChipText,
                          noticeFilter === option.value && styles.controlChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Sort</Text>
                <View style={styles.chipRow}>
                  {sortOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setNoticeSort(option.value)}
                      style={[
                        styles.controlChip,
                        noticeSort === option.value && {
                          backgroundColor: themeColors.primary,
                          borderColor: themeColors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.controlChipText,
                          noticeSort === option.value && styles.controlChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </Panel>

            {announcements.length === 0 ? (
              <EmptyState
                message="Published announcements will appear here for editing and cleanup."
                title="No notices yet"
              />
            ) : visibleAnnouncements.length === 0 ? (
              <EmptyState
                message="Try a different search term, filter, or sort option."
                title="No matching notices"
              />
            ) : (
              visibleAnnouncements.map((announcement) => (
                <Panel key={announcement.id} style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>{announcement.title}</Text>
                  <Text style={styles.noticeMeta}>
                    {formatEventDate(announcement.created_at)}
                  </Text>
                  <Text style={styles.noticeBody}>{announcement.description}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleEditNotice(announcement)}
                      style={[styles.actionChip, styles.editChip]}
                    >
                      <IconSymbol color={colors.text} name="pencil" size={15} />
                      <Text style={styles.actionChipText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={async () => {
                        const confirmed = await showConfirm({
                          confirmLabel: "Delete",
                          message:
                            "This notice will be removed from the student feed.",
                          title: "Delete this notice?",
                          tone: "warning",
                        });
                        if (!confirmed) {
                          return;
                        }
                        await announcementService.deleteAnnouncement(announcement.id);
                        await queryClient.invalidateQueries({
                          queryKey: queryKeys.announcements(adminSelectedBatch?.id ?? null),
                        });
                        await refetchAnnouncements();
                      }}
                      style={styles.actionChip}
                    >
                      <IconSymbol color={themeColors.primary} name="trash.fill" size={15} />
                      <Text style={[styles.actionChipText, { color: themeColors.primary }]}>
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </Panel>
              ))
            )}
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionChip: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  actionChipText: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  collapsedPrompt: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  collapsedPromptText: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 18,
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
  deleteText: {
    color: colors.primary,
  },
  editChip: {
    backgroundColor: colors.surfaceAlt,
  },
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
  fieldCount: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  fieldHelp: {
    color: colors.muted,
    flex: 1,
    fontFamily: typography.regular,
    fontSize: 12,
  },
  fieldMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: -spacing.sm,
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  formBody: {
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  formHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  formHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginLeft: "auto",
  },
  formHeaderText: {
    flex: 1,
  },
  formHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
    marginLeft: "auto",
    minWidth: 220,
  },
  formSection: {
    gap: spacing.sm,
  },
  listHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  listMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  noticeBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  noticeCard: {
    marginBottom: spacing.md,
  },
  noticeCountPill: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  noticeCountText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  noticeMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 4,
  },
  noticeTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
  },
  previewBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  previewBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
  },
  previewLabel: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  previewPlaceholder: {
    opacity: 0.55,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 16,
  },
  chevronButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  section: {
    marginBottom: spacing.lg,
  },
  screenContent: {
    gap: 0,
    paddingTop: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 17,
    marginBottom: spacing.md,
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 0,
    marginTop: spacing.xs,
  },
  tabButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 22,
    marginBottom: 0,
  },
  toolbar: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
});
