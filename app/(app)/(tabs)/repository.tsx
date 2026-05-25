import { StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Screen } from "@/components/ui/Screen";
import { useRepositoryQuery } from "@/src/hooks/queries/useRepositoryQuery";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { useTranslation } from "@/src/utils/i18n";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function RepositoryScreen() {
  const { data: items = [], isLoading } = useRepositoryQuery();
  const themeColors = useThemeColors();
  const { t } = useTranslation();

  if (isLoading) {
    return <LoadingState fullScreen message={t("loadingArchive")} />;
  }

  return (
    <Screen scrollable>
      <Text style={[styles.title, { color: themeColors.text }]}>
        {t("repository")}
      </Text>
      <Text style={[styles.subtitle, { color: themeColors.muted }]}>
        {t("archiveIntro")}
      </Text>
      {items.length === 0 ? (
        <EmptyState
          message={t("archiveEmptyMessage")}
          title={t("archiveEmpty")}
        />
      ) : (
        items.map((item) => (
          <Panel key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: themeColors.accentBlue },
                ]}
              >
                <IconSymbol
                  color={themeColors.white}
                  name="archive"
                  size={18}
                />
              </View>
              <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                {item.events?.title ?? t("campusEvent")}
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: themeColors.muted }]}>
              {item.description}
            </Text>
            {item.image_url ? (
              <View style={styles.assetContainer}>
                <IconSymbol
                  color={themeColors.primary}
                  name="paperplane.fill"
                  size={14}
                />
                <Text style={[styles.asset, { color: themeColors.primary }]}>
                  Media stored in Supabase Storage
                </Text>
              </View>
            ) : null}
          </Panel>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  asset: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
  assetContainer: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 22,
    marginLeft: 40 + spacing.sm, // Align with title
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radii.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
    marginBottom: spacing.sm,
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
});
