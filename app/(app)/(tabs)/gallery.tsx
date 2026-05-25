import { Image } from "expo-image";
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useEventSearchQuery } from "@/src/hooks/queries/useEventSearchQuery";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { formatEventDate } from "@/src/utils/format";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function GalleryScreen() {
  const themeColors = useThemeColors();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: events = [], isLoading, refetch } = useEventSearchQuery("");

  const galleryEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events
      .filter((ev) => Boolean(ev.google_drive_link?.trim()) || (ev.links && ev.links.length > 0))
      .filter((ev) => {
        if (!q) return true;
        const searchable = `${ev.title} ${ev.venue} ${ev.description}`.toLowerCase();
        return searchable.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [events, search]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingState fullScreen message="Loading event photo albums..." />;
  }

  return (
    <Screen
      scrollable
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={themeColors.primary}
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={[styles.title, { color: themeColors.text }]}>Event Gallery</Text>
      <Text style={[styles.subtitle, { color: themeColors.muted }]}>
        Explore Google Drive photo albums and memories shared from past campus events.
      </Text>

      <View style={styles.searchWrap}>
        <TextField
          label=""
          placeholder="Search photo albums by title or venue..."
          value={search}
          onChangeText={setSearch}
          rightIcon={<IconSymbol color={themeColors.muted} name="search" size={16} />}
        />
      </View>

      <Text style={[styles.metaCount, { color: themeColors.muted }]}>
        Showing {galleryEvents.length} available photo album{galleryEvents.length === 1 ? "" : "s"}
      </Text>

      {galleryEvents.length === 0 ? (
        <EmptyState
          message="No event photo galleries found. Coordinators can attach Google Drive album links from the Manage events studio."
          title="No Photo Albums Available"
        />
      ) : (
        <View style={styles.list}>
          {galleryEvents.map((event) => (
            <Panel key={event.id} style={styles.card}>
              {event.image_url ? (
                <Image contentFit="cover" source={{ uri: event.image_url }} style={styles.image} />
              ) : (
                <View style={[styles.fallbackImg, { backgroundColor: themeColors.primarySoft }]}>
                  <IconSymbol color={themeColors.primary} name="photo.fill" size={36} />
                </View>
              )}

              <View style={styles.content}>
                <View style={styles.driveTag}>
                  <IconSymbol color="#4285F4" name="paperplane.fill" size={14} />
                  <Text style={[styles.driveTagText, { color: "#4285F4" }]}>Google Drive Album</Text>
                </View>

                <Text style={[styles.eventTitle, { color: themeColors.text }]}>{event.title}</Text>
                <Text style={[styles.eventMeta, { color: themeColors.muted }]}>
                  {formatEventDate(event.date)} • {event.venue}
                </Text>

                {event.google_drive_link ? (
                  <PrimaryButton
                    icon="paperplane.fill"
                    label="Drive Link 1"
                    onPress={() => void Linking.openURL(event.google_drive_link!)}
                    style={{ marginTop: spacing.md, backgroundColor: "#4285F4" }}
                  />
                ) : null}
                {event.links?.filter(l => l.type === 'drive').map((link, idx) => (
                  <PrimaryButton
                    key={idx}
                    icon="paperplane.fill"
                    label={`Drive Link ${idx + 2}`}
                    onPress={() => void Linking.openURL(link.url)}
                    style={{ marginTop: spacing.md, backgroundColor: "#4285F4" }}
                  />
                ))}
              </View>
            </Panel>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: typography.bold,
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  searchWrap: {
    marginBottom: spacing.xs,
  },
  metaCount: {
    fontFamily: typography.medium,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.xl,
    overflow: "hidden",
    padding: 0,
  },
  image: {
    height: 190,
    width: "100%",
  },
  fallbackImg: {
    alignItems: "center",
    height: 160,
    justifyContent: "center",
    width: "100%",
  },
  content: {
    padding: spacing.md,
  },
  driveTag: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(66, 133, 244, 0.12)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  driveTagText: {
    fontFamily: typography.bold,
    fontSize: 11,
    textTransform: "uppercase",
  },
  eventTitle: {
    fontFamily: typography.bold,
    fontSize: 20,
    marginBottom: 4,
  },
  eventMeta: {
    fontFamily: typography.medium,
    fontSize: 13,
  },
});
