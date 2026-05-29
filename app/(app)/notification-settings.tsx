import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Constants from "expo-constants";

const isExpoGo = Constants.appOwnership === 'expo';
let OneSignal: any = null;

if (!isExpoGo) {
  try {
    OneSignal = require("react-native-onesignal").OneSignal;
  } catch (e) {
    console.warn("[OneSignal] Failed to load react-native-onesignal:", e);
  }
}

import { Screen } from "@/components/ui/Screen";
import { useAppSettingsStore } from "@/src/store/settings-store";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function NotificationSettingsScreen() {
  const themeColors = useThemeColors();
  const profile = useAuthStore((state) => state.profile);
  
  const pushNotifications = useAppSettingsStore((state) => state.pushNotifications);
  const eventAlerts = useAppSettingsStore((state) => state.eventAlerts);
  const announcementAlerts = useAppSettingsStore((state) => state.announcementAlerts);
  const teamRequestAlerts = useAppSettingsStore((state) => state.teamRequestAlerts);
  const adminAlerts = useAppSettingsStore((state) => state.adminAlerts);

  const setPushNotifications = useAppSettingsStore((state) => state.setPushNotifications);
  const setEventAlerts = useAppSettingsStore((state) => state.setEventAlerts);
  const setAnnouncementAlerts = useAppSettingsStore((state) => state.setAnnouncementAlerts);
  const setTeamRequestAlerts = useAppSettingsStore((state) => state.setTeamRequestAlerts);
  const setAdminAlerts = useAppSettingsStore((state) => state.setAdminAlerts);

  const handleToggle = (
    value: boolean, 
    setter: (val: boolean) => void, 
    tagKey: string
  ) => {
    setter(value);
    
    // Safety check in case they are running on web or simulator without OneSignal
    if (Platform.OS !== 'web' && OneSignal) {
        try {
            OneSignal.User.addTag(tagKey, value ? 'true' : 'false');
        } catch (e) {
            console.warn("OneSignal not initialized", e);
        }
    }
  };

  return (
    <Screen scrollable>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Notification Settings",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: themeColors.background },
          headerTintColor: themeColors.text,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Global</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: themeColors.text }]}>Push Notifications</Text>
                <Text style={[styles.rowSubtitle, { color: themeColors.muted }]}>Pause all push notifications from the app</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={(val) => handleToggle(val, setPushNotifications, 'push_notifications')}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Categories</Text>
          <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: themeColors.text }]}>New Events</Text>
                <Text style={[styles.rowSubtitle, { color: themeColors.muted }]}>Get notified when a new campus event is published</Text>
              </View>
              <Switch
                disabled={!pushNotifications}
                value={eventAlerts}
                onValueChange={(val) => handleToggle(val, setEventAlerts, 'event_alerts')}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: themeColors.text }]}>New Notices</Text>
                <Text style={[styles.rowSubtitle, { color: themeColors.muted }]}>Alerts for important campus announcements</Text>
              </View>
              <Switch
                disabled={!pushNotifications}
                value={announcementAlerts}
                onValueChange={(val) => handleToggle(val, setAnnouncementAlerts, 'announcement_alerts')}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
              />
            </View>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={[styles.rowTitle, { color: themeColors.text }]}>Team Requests</Text>
                <Text style={[styles.rowSubtitle, { color: themeColors.muted }]}>Alerts when someone invites you or accepts an invite</Text>
              </View>
              <Switch
                disabled={!pushNotifications}
                value={teamRequestAlerts}
                onValueChange={(val) => handleToggle(val, setTeamRequestAlerts, 'team_request_alerts')}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
              />
            </View>
          </View>
        </View>

        {profile?.role === 'admin' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Admin Controls</Text>
            <View style={[styles.card, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={[styles.rowTitle, { color: themeColors.text }]}>Admin Activity</Text>
                  <Text style={[styles.rowSubtitle, { color: themeColors.muted }]}>Notify me about support tickets and system events</Text>
                </View>
                <Switch
                  disabled={!pushNotifications}
                  value={adminAlerts}
                  onValueChange={(val) => handleToggle(val, setAdminAlerts, 'admin_alerts')}
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                />
              </View>
            </View>
          </View>
        )}
        
        <View style={styles.infoSection}>
            <Ionicons name="information-circle-outline" size={20} color={themeColors.muted} />
            <Text style={[styles.infoText, { color: themeColors.muted }]}>
              The notification sound depends on your phone&apos;s default system alert settings. To change the sound, visit your device&apos;s global notification settings.
            </Text>
        </View>
        
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  rowContent: {
    flex: 1,
    paddingRight: spacing.md,
  },
  rowTitle: {
    fontFamily: typography.semiBold,
    fontSize: 16,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: typography.regular,
    fontSize: 13,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  infoSection: {
      flexDirection: "row",
      alignItems: "flex-start",
      padding: spacing.md,
      gap: spacing.sm,
  },
  infoText: {
      flex: 1,
      fontFamily: typography.regular,
      fontSize: 13,
      lineHeight: 18,
  }
});
