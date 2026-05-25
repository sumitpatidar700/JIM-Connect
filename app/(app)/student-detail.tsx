import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { useUserRegistrationsQuery } from "@/src/hooks/queries/useUserRegistrationsQuery";
import { useAuthStore } from "@/src/store/auth-store";
import { useProfileQuery } from "@/src/hooks/queries/useProfileQuery";
import { useWinnersQuery } from "@/src/hooks/queries/useWinnersQuery";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { formatEventDate } from "@/src/utils/format";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function StudentDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const themeColors = useThemeColors();
  const currentUser = useAuthStore((state) => state.profile);

  const [activeTab, setActiveTab] = useState<"registrations" | "winnings">("registrations");

  const { data: student, isLoading: usersLoading } = useProfileQuery(userId);
  const { data: registrations = [], isLoading: registrationsLoading } = useUserRegistrationsQuery(userId);
  const { data: allWinners = [], isLoading: winnersLoading } = useWinnersQuery();

  const studentWinners = useMemo(() => {
    if (!student) return [];
    const sName = student.name.toLowerCase().trim();
    return allWinners.filter((w) => w.name.toLowerCase().trim() === sName);
  }, [allWinners, student]);

  if (usersLoading || registrationsLoading || winnersLoading) {
    return <LoadingState fullScreen message="Retrieving student profile & event records..." />;
  }

  if (!student) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <IconSymbol color={themeColors.text} name="chevron.left" size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>Profile Not Found</Text>
        </View>
        <EmptyState
          message="The student profile you are looking for could not be found or may have been removed."
          title="Profile Unavailable"
        />
      </Screen>
    );
  }

  const isPrivateAndRestricted = student.is_private && currentUser?.role !== "admin" && currentUser?.id !== student.id;

  if (isPrivateAndRestricted) {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <IconSymbol color={themeColors.text} name="chevron.left" size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.text }]}>Private Account</Text>
        </View>
        <EmptyState
          message="This account is private. Only admins can view this profile."
          title="Private Profile"
        />
      </Screen>
    );
  }

  const handleCall = () => {
    if (student.phone) {
      Linking.openURL(`tel:${student.phone}`);
    }
  };

  const handleEmail = () => {
    if (student.email) {
      Linking.openURL(`mailto:${student.email}`);
    }
  };

  const handleWhatsApp = () => {
    if (student.phone) {
      Linking.openURL(`https://wa.me/91${student.phone}`);
    }
  };

  const joinedDateFormatted = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(student.created_at));

  return (
    <Screen scrollable>
      {/* Top Bar */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <IconSymbol color={themeColors.text} name="chevron.left" size={24} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: themeColors.text }]}>Student Detail</Text>
          <Text style={[styles.subtitle, { color: themeColors.muted }]}>
            Joined {joinedDateFormatted}
          </Text>
        </View>
        <Pill
          label={student.role === "admin" ? "Staff" : "Student"}
          tone={student.role === "admin" ? "brand" : "dark"}
        />
      </View>

      {/* Hero Overview Card */}
      <Panel style={styles.heroCard}>
        <View style={styles.avatarMain}>
          <View style={[styles.avatarWrapper, { backgroundColor: themeColors.surfaceAlt }]}>
            {student.avatar_url ? (
              <Image source={{ uri: student.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarInitial, { color: themeColors.text }]}>
                {student.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.studentName, { color: themeColors.text }]}>{student.name}</Text>
          <Text style={[styles.studentEmail, { color: themeColors.muted }]}>{student.email}</Text>
          {student.phone && (
            <View style={styles.phoneBadge}>
              <IconSymbol color={themeColors.primary} name="paperplane.fill" size={14} />
              <Text style={[styles.studentPhone, { color: themeColors.primary }]}>
                +91 {student.phone}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* Action Toolbar */}
        <View style={styles.actionToolbar}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleEmail}
            style={[styles.actionBtn, { backgroundColor: themeColors.surfaceAlt }]}
          >
            <IconSymbol color={themeColors.primary} name="paperplane.fill" size={16} />
            <Text style={[styles.actionBtnText, { color: themeColors.primary }]}>Email</Text>
          </TouchableOpacity>

          {student.phone && (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleCall}
                style={[styles.actionBtn, { backgroundColor: themeColors.surfaceAlt }]}
              >
                <IconSymbol color={themeColors.primary} name="paperplane.fill" size={16} />
                <Text style={[styles.actionBtnText, { color: themeColors.primary }]}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleWhatsApp}
                style={[styles.actionBtn, { backgroundColor: "#25D366" }]}
              >
                <IconSymbol color={colors.white} name="paperplane.fill" size={16} />
                <Text style={[styles.actionBtnText, { color: colors.white }]}>WhatsApp</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Panel>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab("registrations")}
          style={[
            styles.tabButton,
            { borderColor: themeColors.border, backgroundColor: themeColors.surface },
            activeTab === "registrations" && {
              backgroundColor: themeColors.primary,
              borderColor: themeColors.primary,
            },
          ]}
        >
          <IconSymbol
            color={activeTab === "registrations" ? colors.white : themeColors.muted}
            name="calendar"
            size={16}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "registrations" ? colors.white : themeColors.muted },
            ]}
          >
            Registered ({registrations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab("winnings")}
          style={[
            styles.tabButton,
            { borderColor: themeColors.border, backgroundColor: themeColors.surface },
            activeTab === "winnings" && {
              backgroundColor: themeColors.primary,
              borderColor: themeColors.primary,
            },
          ]}
        >
          <IconSymbol
            color={activeTab === "winnings" ? colors.white : themeColors.muted}
            name="star.fill"
            size={16}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "winnings" ? colors.white : themeColors.muted },
            ]}
          >
            Trophies ({studentWinners.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.sectionContainer}>
        {activeTab === "registrations" ? (
          registrations.length === 0 ? (
            <EmptyState
              message="This student has not registered for any campus events yet."
              title="No Registrations"
            />
          ) : (
            <View style={styles.eventsList}>
              {registrations.map((reg) => (
                <Panel key={reg.id} style={styles.eventCard}>
                  <View style={styles.eventInfo}>
                    <Text style={[styles.eventTitle, { color: themeColors.text }]}>
                      {reg.events?.title || "Campus Event"}
                    </Text>
                    <Text style={[styles.eventMeta, { color: themeColors.muted }]}>
                      {[
                        reg.events?.date ? formatEventDate(reg.events.date) : "Date TBD",
                        reg.events?.venue || "Venue TBD",
                      ].join(" • ")}
                    </Text>
                  </View>
                  <View style={styles.regBadge}>
                    <Pill label="Registered" tone="brand" />
                  </View>
                </Panel>
              ))}
            </View>
          )
        ) : studentWinners.length === 0 ? (
          <EmptyState
            message="No winning trophies or leaderboard entries found for this student profile."
            title="No Winning Records"
          />
        ) : (
          <View style={styles.eventsList}>
            {studentWinners.map((win) => (
              <Panel key={win.id} style={styles.winnerCard}>
                {win.image_url && (
                  <Image source={{ uri: win.image_url }} style={styles.winnerImg} />
                )}
                <View style={styles.winnerInfo}>
                  <View style={styles.trophyRow}>
                    <IconSymbol color="#F59E0B" name="star.fill" size={18} />
                    <Text style={[styles.posBadgeText, { color: "#D97706" }]}>
                      {win.position} Place
                    </Text>
                  </View>
                  <Text style={[styles.winnerEventTitle, { color: themeColors.text }]}>
                    {win.events?.title || "Campus Competition"}
                  </Text>
                  <Text style={[styles.winnerMeta, { color: themeColors.muted }]}>
                    {[
                      win.events?.date ? formatEventDate(win.events.date) : "Date TBD",
                      win.events?.venue || "Venue TBD",
                    ].join(" • ")}
                  </Text>
                </View>
              </Panel>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    marginLeft: -spacing.xs,
    width: 40,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 24,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  avatarMain: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  avatarWrapper: {
    alignItems: "center",
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
    width: 96,
  },
  avatarImg: {
    height: "100%",
    width: "100%",
  },
  avatarInitial: {
    fontFamily: typography.bold,
    fontSize: 36,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 22,
    marginBottom: 4,
    textAlign: "center",
  },
  studentEmail: {
    fontFamily: typography.regular,
    fontSize: 14,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  phoneBadge: {
    alignItems: "center",
    backgroundColor: "rgba(20, 83, 45, 0.08)",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  studentPhone: {
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginVertical: spacing.md,
    opacity: 0.6,
    width: "100%",
  },
  actionToolbar: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12,
  },
  tabText: {
    fontFamily: typography.semiBold,
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: spacing.xl,
  },
  eventsList: {
    gap: spacing.sm,
  },
  eventCard: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  eventInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  eventTitle: {
    fontFamily: typography.semiBold,
    fontSize: 16,
    marginBottom: 4,
  },
  eventMeta: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
  regBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  winnerCard: {
    alignItems: "center",
    borderRadius: 16,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  winnerImg: {
    borderRadius: 12,
    height: 60,
    width: 60,
  },
  winnerInfo: {
    flex: 1,
  },
  trophyRow: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    alignSelf: "flex-start",
    borderRadius: 12,
    flexDirection: "row",
    gap: 4,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  posBadgeText: {
    fontFamily: typography.bold,
    fontSize: 12,
  },
  winnerEventTitle: {
    fontFamily: typography.semiBold,
    fontSize: 16,
    marginBottom: 2,
  },
  winnerMeta: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
});
