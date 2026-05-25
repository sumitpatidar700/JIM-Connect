import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as Location from "expo-location";

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
});
