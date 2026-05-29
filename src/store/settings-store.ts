import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type FontScale = "small" | "medium" | "large";
export type ThemeMode = "system" | "light" | "dark";
export type LanguageOption = "en" | "hi";
export type AccentColor =
  | "emerald"
  | "yellow"
  | "skyBlue"
  | "lightRed"
  | "amber";

export interface AppSettingsState {
  accentColor: AccentColor;
  announcementAlerts: boolean;
  compactLayout: boolean;
  dataSaver: boolean;
  eventAlerts: boolean;
  teamRequestAlerts: boolean;
  adminAlerts: boolean;
  registrationsOpen: boolean;
  fontScale: FontScale;
  language: LanguageOption;
  logoPreviewEnabled: boolean;
  locationAccess: boolean;
  notificationReminders: boolean;
  profileVisibility: boolean;
  pushNotifications: boolean;
  reduceMotion: boolean;
  sharingActivity: boolean;
  themeMode: ThemeMode;
  vibrationFeedback: boolean;
  setAccentColor: (value: AccentColor) => void;
  setAnnouncementAlerts: (value: boolean) => void;
  setCompactLayout: (value: boolean) => void;
  setDataSaver: (value: boolean) => void;
  setEventAlerts: (value: boolean) => void;
  setTeamRequestAlerts: (value: boolean) => void;
  setAdminAlerts: (value: boolean) => void;
  setRegistrationsOpen: (value: boolean) => void;
  setFontScale: (value: FontScale) => void;
  setLanguage: (value: LanguageOption) => void;
  setLogoPreviewEnabled: (value: boolean) => void;
  setLocationAccess: (value: boolean) => void;
  setNotificationReminders: (value: boolean) => void;
  setProfileVisibility: (value: boolean) => void;
  setPushNotifications: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  setSharingActivity: (value: boolean) => void;
  setThemeMode: (value: ThemeMode) => void;
  setVibrationFeedback: (value: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      accentColor: "skyBlue",
      announcementAlerts: true,
      compactLayout: false,
      dataSaver: false,
      registrationsOpen: true,
      eventAlerts: true,
      teamRequestAlerts: true,
      adminAlerts: true,
      fontScale: "small",
      language: "en",
      logoPreviewEnabled: true,
      locationAccess: false,
      notificationReminders: true,
      profileVisibility: true,
      pushNotifications: true,
      reduceMotion: false,
      sharingActivity: true,
      themeMode: "light",
      vibrationFeedback: true,
      setAccentColor: (value) => set({ accentColor: value }),
      setAnnouncementAlerts: (value) => set({ announcementAlerts: value }),
      setCompactLayout: (value) => set({ compactLayout: value }),
      setDataSaver: (value) => set({ dataSaver: value }),
      setEventAlerts: (value) => set({ eventAlerts: value }),
      setTeamRequestAlerts: (value) => set({ teamRequestAlerts: value }),
      setAdminAlerts: (value) => set({ adminAlerts: value }),
      setRegistrationsOpen: (value) => set({ registrationsOpen: value }),
      setFontScale: (value) => set({ fontScale: value }),
      setLanguage: (value) => set({ language: value }),
      setLogoPreviewEnabled: (value) => set({ logoPreviewEnabled: value }),
      setLocationAccess: (value) => set({ locationAccess: value }),
      setNotificationReminders: (value) =>
        set({ notificationReminders: value }),
      setProfileVisibility: (value) => set({ profileVisibility: value }),
      setPushNotifications: (value) => set({ pushNotifications: value }),
      setReduceMotion: (value) => set({ reduceMotion: value }),
      setSharingActivity: (value) => set({ sharingActivity: value }),
      setThemeMode: (value) => set({ themeMode: value }),
      setVibrationFeedback: (value) => set({ vibrationFeedback: value }),
    }),
    {
      name: "ji-connect-app-settings",
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState) => ({
        ...(persistedState as Partial<AppSettingsState>),
        accentColor: normalizeAccentColor(
          (persistedState as Partial<AppSettingsState>)?.accentColor,
        ),
        logoPreviewEnabled:
          (persistedState as Partial<AppSettingsState>)?.logoPreviewEnabled ??
          true,
        themeMode:
          (persistedState as Partial<AppSettingsState>)?.themeMode ?? "light",
      }),
      version: 5,
    },
  ),
);

function normalizeAccentColor(value: unknown): AccentColor {
  if (
    value === "emerald" ||
    value === "yellow" ||
    value === "skyBlue" ||
    value === "lightRed" ||
    value === "amber"
  ) {
    return value;
  }

  if (value === "greenLight") {
    return "emerald";
  }

  if (value === "ocean") {
    return "skyBlue";
  }

  if (value === "rose") {
    return "lightRed";
  }

  return "emerald";
}
