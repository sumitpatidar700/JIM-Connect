import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import * as Location from "expo-location";
import { sessionService } from "@/src/services/session-service";
import { batchService } from "@/src/services/batch-service";
import { AcademicSession, Batch } from "@/src/types/app";

import { BackButton } from "@/components/ui/BackButton";
import { Panel } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { authService } from "@/src/services/auth-service";
import { useAuthStore } from "@/src/store/auth-store";
import {
  AccentColor,
  FontScale,
  LanguageOption,
  ThemeMode,
  useAppSettingsStore,
} from "@/src/store/settings-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { useTranslation } from "@/src/utils/i18n";
import {
  accentPalettes,
  applyFontScale,
  useThemeColors,
} from "@/src/utils/settings-effects";

const fontScaleOptions: { labelKey: "small" | "medium" | "large"; value: FontScale }[] = [
  { labelKey: "small", value: "small" },
  { labelKey: "medium", value: "medium" },
  { labelKey: "large", value: "large" },
];

const themeOptions: { labelKey: "system" | "light" | "dark"; value: ThemeMode }[] = [
  { labelKey: "system", value: "system" },
  { labelKey: "light", value: "light" },
  { labelKey: "dark", value: "dark" },
];

const accentOptions: {
  labelKey:
    | "emerald"
    | "yellow"
    | "skyBlue"
    | "lightRed"
    | "amber";
  value: AccentColor;
}[] = [
  { labelKey: "emerald", value: "emerald" },
  { labelKey: "yellow", value: "yellow" },
  { labelKey: "skyBlue", value: "skyBlue" },
  { labelKey: "lightRed", value: "lightRed" },
  { labelKey: "amber", value: "amber" },
];

const languageOptions: { labelKey: "english" | "hindi"; value: LanguageOption }[] = [
  { labelKey: "english", value: "en" },
  { labelKey: "hindi", value: "hi" },
];

type SettingRowProps = {
  description: string;
  label: string;
  switchValue: boolean;
  onToggle: (value: boolean) => void;
};

function SettingRow({
  description,
  label,
  onToggle,
  switchValue,
}: SettingRowProps) {
  const themeColors = useThemeColors();
  const fontScale = useAppSettingsStore((state) => state.fontScale);

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowLabel,
            { color: themeColors.text, fontSize: applyFontScale(14, fontScale) },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.rowDescription,
            { color: themeColors.muted, fontSize: applyFontScale(12, fontScale) },
          ]}
        >
          {description}
        </Text>
      </View>
      <Switch
        trackColor={{ false: themeColors.surfaceAlt, true: themeColors.primarySoft }}
        thumbColor={switchValue ? themeColors.primary : themeColors.white}
        value={switchValue}
        onValueChange={onToggle}
      />
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const themeColors = useThemeColors();
  const fontScale = useAppSettingsStore((state) => state.fontScale);

  return (
    <View style={styles.sectionHeader}>
      <Text
        style={[
          styles.sectionTitle,
          { color: themeColors.text, fontSize: applyFontScale(16, fontScale) },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.sectionSubtitle,
          { color: themeColors.muted, fontSize: applyFontScale(12, fontScale) },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function OptionButton<TValue extends string>({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  value: TValue;
}) {
  const themeColors = useThemeColors();
  const fontScale = useAppSettingsStore((state) => state.fontScale);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        {
          backgroundColor: active ? themeColors.primarySoft : themeColors.background,
          borderColor: active ? themeColors.primary : themeColors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.optionButtonText,
          {
            color: active ? themeColors.primary : themeColors.text,
            fontSize: applyFontScale(13, fontScale),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ColorOptionButton({
  active,
  label,
  onPress,
  value,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  value: AccentColor;
}) {
  const themeColors = useThemeColors();
  const fontScale = useAppSettingsStore((state) => state.fontScale);
  const themeMode = useAppSettingsStore((state) => state.themeMode);
  const swatch =
    accentPalettes[value][themeMode === "dark" ? "dark" : "light"].primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.colorButton,
        {
          backgroundColor: active ? themeColors.primarySoft : themeColors.background,
          borderColor: active ? themeColors.primary : themeColors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.colorSwatch, { backgroundColor: swatch }]} />
      <Text
        numberOfLines={1}
        style={[
          styles.colorButtonText,
          {
            color: active ? themeColors.primary : themeColors.text,
            fontSize: applyFontScale(12, fontScale),
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { showAlert } = useAppFeedback();
  const profile = useAuthStore((state) => state.profile);
  const session = useAuthStore((state) => state.session);
  const activeSession = useAuthStore((state) => state.activeSession);
  const setAuthState = useAuthStore((state) => state.setAuthState);
  const {
    accentColor,
    announcementAlerts,
    compactLayout,
    eventAlerts,
    fontScale,
    language,
    logoPreviewEnabled,
    locationAccess,
    profileVisibility,
    pushNotifications,
    setAccentColor,
    setAnnouncementAlerts,
    setCompactLayout,
    setEventAlerts,
    setFontScale,
    setLanguage,
    setLogoPreviewEnabled,
    setLocationAccess,
    setProfileVisibility,
    setPushNotifications,
    setThemeMode,
    themeMode,
  } = useAppSettingsStore();
  const themeColors = useThemeColors();
  const { t } = useTranslation();

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);

  const [batchesState, setBatchesState] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);

  const activeSessionName = sessions.find((s) => s.is_active)?.name ?? "None (Showing all content)";

  const loadSessionsList = async () => {
    if (profile?.role !== "admin") return;
    try {
      setLoadingSessions(true);
      const list = await sessionService.listSessions();
      setSessions(list);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadBatchesList = async () => {
    if (profile?.role !== "admin") return;
    try {
      setLoadingBatches(true);
      const list = await batchService.listBatches();
      setBatchesState(list);
      useAuthStore.getState().setBatches(list);
    } catch (err) {
      console.error("Failed to load batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    void loadSessionsList();
    void loadBatchesList();
  }, [profile?.role]);

  const handleCreateSession = async () => {
    const trimmed = newSessionName.trim();
    if (!trimmed) return;
    try {
      setCreatingSession(true);
      await sessionService.createSession(trimmed);
      setNewSessionName("");
      const list = await sessionService.listSessions();
      setSessions(list);
      const active = list.find((s) => s.is_active) ?? null;
      useAuthStore.setState({ activeSession: active });
      await showAlert({
        title: "Session Created",
        message: `Academic session "${trimmed}" created successfully.`,
        tone: "success",
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Creating Session",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "error",
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const handleActivateSession = async (id: string) => {
    try {
      await sessionService.makeSessionActive(id);
      const list = await sessionService.listSessions();
      setSessions(list);
      const active = list.find((s) => s.is_active) ?? null;
      useAuthStore.setState({ activeSession: active });
      await showAlert({
        title: "Session Activated",
        message: "The selected academic session is now active.",
        tone: "success",
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Activating Session",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "error",
      });
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await sessionService.deleteSession(id);
      const list = await sessionService.listSessions();
      setSessions(list);
      const active = list.find((s) => s.is_active) ?? null;
      useAuthStore.setState({ activeSession: active });
      await showAlert({
        title: "Session Deleted",
        message: "Academic session deleted successfully.",
        tone: "success",
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Deleting Session",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "error",
      });
    }
  };

  const handleCreateBatch = async () => {
    const trimmed = newBatchName.trim();
    if (!trimmed) return;
    try {
      setCreatingBatch(true);
      await batchService.createBatch(trimmed);
      setNewBatchName("");
      await loadBatchesList();
      await showAlert({
        title: "Batch Created",
        message: `Academic batch "${trimmed}" created successfully.`,
        tone: "success",
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Creating Batch",
        message: err instanceof Error ? err.message : "An unexpected error occurred.",
        tone: "error",
      });
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleDeleteBatch = async (id: string) => {
    try {
      await batchService.deleteBatch(id);
      await loadBatchesList();
      await showAlert({
        title: "Batch Deleted",
        message: "Academic batch deleted successfully.",
        tone: "success",
      });
    } catch (err: any) {
      await showAlert({
        title: "Error Deleting Batch",
        message: err instanceof Error ? err.message : "Please ensure no student is currently assigned to this batch before deleting.",
        tone: "error",
      });
    }
  };

  const handleProfileVisibilityToggle = async (value: boolean) => {
    setProfileVisibility(value);
    if (profile) {
      try {
        const updatedProfile = await authService.updatePrivacy(profile.id, !value);
        setAuthState({ profile: updatedProfile, session });
      } catch (error) {
        setProfileVisibility(!value);
        await showAlert({
          title: "Update Failed",
          message: "Could not update your profile visibility. Please check your connection.",
          tone: "error",
        });
      }
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    if (!value) {
      setLocationAccess(false);
      return;
    }

    const currentPermission = await Location.getForegroundPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (!permission.granted) {
      setLocationAccess(false);
      await showAlert({
        message:
          "Location permission is needed before nearby campus features can use your position.",
        title: "Location blocked",
        tone: "warning",
      });
      return;
    }

    setLocationAccess(true);
  };

  return (
    <Screen scrollable contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <BackButton fallbackHref="/(app)/(tabs)" iconOnly plain />
        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              { color: themeColors.text, fontSize: applyFontScale(23, fontScale) },
            ]}
          >
            {t("appSettings")}
          </Text>
          <Text
            style={[
              styles.intro,
              { color: themeColors.muted, fontSize: applyFontScale(13, fontScale) },
            ]}
          >
            {t("settingsIntro")}
          </Text>
        </View>
      </View>

      <SectionTitle
        title={t("display")}
        subtitle={t("displayIntro")}
      />
      <Panel style={styles.panel}>
        <Text style={[styles.groupLabel, { color: themeColors.text }]}>{t("theme")}</Text>
        <View style={styles.optionGrid}>
          {themeOptions.map((option) => (
            <OptionButton
              key={option.value}
              active={themeMode === option.value}
              label={t(option.labelKey)}
              onPress={() => setThemeMode(option.value)}
              value={option.value}
            />
          ))}
        </View>

        <Text style={[styles.groupLabel, { color: themeColors.text }]}>{t("colorTheme")}</Text>
        <View style={styles.colorGrid}>
          {accentOptions.map((option) => (
            <ColorOptionButton
              key={option.value}
              active={accentColor === option.value}
              label={t(option.labelKey)}
              onPress={() => setAccentColor(option.value)}
              value={option.value}
            />
          ))}
        </View>

        <Text style={[styles.groupLabel, { color: themeColors.text }]}>{t("textSize")}</Text>
        <View style={styles.optionGrid}>
          {fontScaleOptions.map((option) => (
            <OptionButton
              key={option.value}
              active={fontScale === option.value}
              label={t(option.labelKey)}
              onPress={() => setFontScale(option.value)}
              value={option.value}
            />
          ))}
        </View>

        <SettingRow
          description={t("compactLayoutDescription")}
          label={t("compactLayout")}
          switchValue={compactLayout}
          onToggle={setCompactLayout}
        />
        <SettingRow
          description={t("logoPreviewDescription")}
          label={t("logoPreview")}
          switchValue={logoPreviewEnabled}
          onToggle={setLogoPreviewEnabled}
        />
      </Panel>

      <SectionTitle
        title={t("notifications")}
        subtitle={t("notificationsIntro")}
      />
      <Panel style={styles.panel}>
        <SettingRow
          description={t("pushNotificationsDescription")}
          label={t("pushNotifications")}
          switchValue={pushNotifications}
          onToggle={setPushNotifications}
        />
        <SettingRow
          description={t("eventAlertsDescription")}
          label={t("eventAlerts")}
          switchValue={eventAlerts}
          onToggle={setEventAlerts}
        />
        <SettingRow
          description={t("feedIsQuietMessage")}
          label={t("announcements")}
          switchValue={announcementAlerts}
          onToggle={setAnnouncementAlerts}
        />
      </Panel>

      <SectionTitle
        title={t("privacy")}
        subtitle={t("privacyIntro")}
      />
      <Panel style={styles.panel}>
        <SettingRow
          description={t("profileVisibilityDescription")}
          label={t("profileVisibility")}
          switchValue={profile ? !profile.is_private : profileVisibility}
          onToggle={handleProfileVisibilityToggle}
        />
        <SettingRow
          description={t("locationAccessDescription")}
          label={t("locationAccess")}
          switchValue={locationAccess}
          onToggle={(value) => void handleLocationToggle(value)}
        />
      </Panel>

      <SectionTitle
        title={t("language")}
        subtitle={t("languageIntro")}
      />
      <Panel style={styles.panel}>
        <View style={styles.optionGrid}>
          {languageOptions.map((option) => (
            <OptionButton
              key={option.value}
              active={language === option.value}
              label={t(option.labelKey)}
              onPress={() => setLanguage(option.value)}
              value={option.value}
            />
          ))}
        </View>
      </Panel>

      {profile?.role === "admin" && (
        <>
          <SectionTitle
            title="Academic Sessions"
            subtitle="Manage college academic sessions and set the active session under which announcements, events, and winners will be published."
          />
          <Panel style={styles.panel}>
            {/* Warning Card when no active session */}
            {!activeSession && (
              <View
                style={[
                  styles.warningCard,
                  {
                    backgroundColor: themeColors.primarySoft,
                    borderColor: themeColors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.warningText,
                    {
                      color: themeColors.primary,
                      fontSize: applyFontScale(13, fontScale),
                    },
                  ]}
                >
                  ⚠️ ACTION REQUIRED: There is currently no active academic session. Publishing events, notices, and results will be disabled across the app until you create a session below and click &quot;Activate&quot;.
                </Text>
              </View>
            )}

            {/* Active Session Indicator */}
            <View
              style={[
                styles.activeSessionDisplay,
                {
                  backgroundColor: themeColors.surfaceAlt,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.activeSessionLabel,
                  { color: themeColors.muted, fontSize: applyFontScale(10, fontScale) },
                ]}
              >
                CURRENTLY ACTIVE
              </Text>
              <Text
                style={[
                  styles.activeSessionName,
                  { color: themeColors.text, fontSize: applyFontScale(16, fontScale) },
                ]}
              >
                {activeSessionName}
              </Text>
            </View>

            {/* Create Session Form */}
            <View style={styles.createSessionRow}>
              <TextInput
                placeholder="Session Name (e.g. 2025-2027)"
                placeholderTextColor={themeColors.muted}
                value={newSessionName}
                onChangeText={setNewSessionName}
                style={[
                  styles.sessionInput,
                  {
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    fontSize: applyFontScale(14, fontScale),
                  },
                ]}
              />
              <Pressable
                onPress={handleCreateSession}
                disabled={creatingSession || !newSessionName.trim()}
                style={({ pressed }) => [
                  styles.createSessionButton,
                  {
                    backgroundColor: themeColors.primary,
                  },
                  pressed && styles.pressed,
                  (!newSessionName.trim() || creatingSession) && styles.disabledButton,
                ]}
              >
                <Text
                  style={[
                    styles.createSessionButtonText,
                    { fontSize: applyFontScale(14, fontScale) },
                  ]}
                >
                  {creatingSession ? "Creating..." : "Create"}
                </Text>
              </Pressable>
            </View>

            {/* Sessions List */}
            {loadingSessions ? (
              <Text
                style={[
                  styles.loadingText,
                  { color: themeColors.muted, fontSize: applyFontScale(14, fontScale) },
                ]}
              >
                Loading sessions...
              </Text>
            ) : sessions.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: themeColors.muted, fontSize: applyFontScale(14, fontScale) },
                ]}
              >
                No sessions created yet.
              </Text>
            ) : (
              <View style={styles.sessionsList}>
                {sessions.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.sessionListItem,
                      { borderColor: themeColors.border },
                    ]}
                  >
                    <View style={styles.sessionItemInfo}>
                      <Text
                        style={[
                          styles.sessionItemName,
                          {
                            color: themeColors.text,
                            fontSize: applyFontScale(14, fontScale),
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.is_active && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: themeColors.primarySoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.activeBadgeText,
                              {
                                color: themeColors.primary,
                                fontSize: applyFontScale(11, fontScale),
                              },
                            ]}
                          >
                            Active
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.sessionItemActions}>
                      {!item.is_active && (
                        <Pressable
                          onPress={() => handleActivateSession(item.id)}
                          style={({ pressed }) => [
                            styles.actionButton,
                            { borderColor: themeColors.primary },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.actionButtonText,
                              {
                                color: themeColors.primary,
                                fontSize: applyFontScale(12, fontScale),
                              },
                            ]}
                          >
                            Activate
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => handleDeleteSession(item.id)}
                        style={({ pressed }) => [
                          styles.deleteActionButton,
                          { backgroundColor: themeColors.primarySoft },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.deleteActionButtonText,
                            {
                              color: themeColors.primary,
                              fontSize: applyFontScale(12, fontScale),
                            },
                          ]}
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Panel>

          <SectionTitle
            title="Batch Management"
            subtitle="Manage college academic batches. These are used to group students and scope events, notices, or results to specific targets."
          />
          <Panel style={styles.panel}>
            {/* Create Batch Form */}
            <View style={styles.createSessionRow}>
              <TextInput
                placeholder="Batch Name (e.g. BCA 2025)"
                placeholderTextColor={themeColors.muted}
                value={newBatchName}
                onChangeText={setNewBatchName}
                style={[
                  styles.sessionInput,
                  {
                    color: themeColors.text,
                    borderColor: themeColors.border,
                    backgroundColor: themeColors.background,
                    fontSize: applyFontScale(14, fontScale),
                  },
                ]}
              />
              <Pressable
                onPress={handleCreateBatch}
                disabled={creatingBatch || !newBatchName.trim()}
                style={({ pressed }) => [
                  styles.createSessionButton,
                  {
                    backgroundColor: themeColors.primary,
                  },
                  pressed && styles.pressed,
                  (!newBatchName.trim() || creatingBatch) && styles.disabledButton,
                ]}
              >
                <Text
                  style={[
                    styles.createSessionButtonText,
                    { fontSize: applyFontScale(14, fontScale) },
                  ]}
                >
                  {creatingBatch ? "Creating..." : "Create"}
                </Text>
              </Pressable>
            </View>

            {/* Batches List */}
            {loadingBatches ? (
              <Text
                style={[
                  styles.loadingText,
                  { color: themeColors.muted, fontSize: applyFontScale(14, fontScale) },
                ]}
              >
                Loading batches...
              </Text>
            ) : batchesState.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: themeColors.muted, fontSize: applyFontScale(14, fontScale) },
                ]}
              >
                No batches created yet.
              </Text>
            ) : (
              <View style={styles.sessionsList}>
                {batchesState.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.sessionListItem,
                      { borderColor: themeColors.border },
                    ]}
                  >
                    <View style={styles.sessionItemInfo}>
                      <Text
                        style={[
                          styles.sessionItemName,
                          {
                            color: themeColors.text,
                            fontSize: applyFontScale(14, fontScale),
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.sessionItemActions}>
                      <Pressable
                        onPress={() => handleDeleteBatch(item.id)}
                        style={({ pressed }) => [
                          styles.deleteActionButton,
                          { backgroundColor: themeColors.primarySoft },
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.deleteActionButtonText,
                            {
                              color: themeColors.primary,
                              fontSize: applyFontScale(12, fontScale),
                            },
                          ]}
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Panel>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 0,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  colorButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: spacing.sm,
  },
  colorButtonText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorSwatch: {
    borderRadius: radii.round,
    height: 16,
    width: 16,
  },
  groupLabel: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  intro: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  optionButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  optionButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionButtonText: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  optionButtonTextActive: {
    color: colors.primary,
  },
  optionGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  panel: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.78,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  rowDescription: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  rowLabel: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 14,
    marginBottom: 2,
  },
  rowText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  sectionHeader: {
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 16,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 23,
    lineHeight: 29,
  },
  activeSessionDisplay: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  activeSessionLabel: {
    fontFamily: typography.semiBold,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  activeSessionName: {
    fontFamily: typography.bold,
    fontSize: 16,
  },
  createSessionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sessionInput: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 44,
    fontFamily: typography.regular,
    fontSize: 14,
  },
  createSessionButton: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  createSessionButtonText: {
    color: "#ffffff",
    fontFamily: typography.bold,
    fontSize: 14,
  },
  loadingText: {
    fontFamily: typography.regular,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontFamily: typography.regular,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  sessionsList: {
    gap: spacing.sm,
  },
  sessionListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  sessionItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sessionItemName: {
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  activeBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontFamily: typography.bold,
    fontSize: 11,
  },
  sessionItemActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontFamily: typography.bold,
    fontSize: 12,
  },
  deleteActionButton: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionButtonText: {
    fontFamily: typography.bold,
    fontSize: 12,
  },
  warningCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  warningText: {
    fontFamily: typography.medium,
    lineHeight: 18,
  },
});
