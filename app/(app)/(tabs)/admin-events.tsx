import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Modal,
    Share,
    PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

import { EmptyState } from "@/components/ui/EmptyState";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LoadingState } from "@/components/ui/LoadingState";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CustomBannerEditorModal } from "@/components/ui/CustomBannerEditorModal";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { eventService } from "@/src/services/event-service";
import { winnerService } from "@/src/services/winner-service";
import { useAuthStore } from "@/src/store/auth-store";
import { colors, radii, spacing, typography } from "@/src/theme/tokens";
import { EventItem, WinnerItem } from "@/src/types/app";
import { formatEventDate } from "@/src/utils/format";
import { useTranslation } from "@/src/utils/i18n";
import { getRegistrationState } from "@/src/utils/registration-status";
import { useThemeColors } from "@/src/utils/settings-effects";
import { COMMITTEES_LIST, CLUBS_LIST } from "@/src/constants/event-tags";

type EventFilter = "all" | "upcoming" | "past";
type EventSort = "latest-added" | "soonest" | "latest" | "az";

const eventFilterOptions: { label: string; value: EventFilter }[] = [
  { label: "All", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
];

const eventSortOptions: { label: string; value: EventSort }[] = [
  { label: "Latest added", value: "latest-added" },
  { label: "Soonest", value: "soonest" },
  { label: "Latest", value: "latest" },
  { label: "A-Z", value: "az" },
];

export default function AdminEventsScreen() {
  const { showAlert, showConfirm } = useAppFeedback();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((state) => state.profile);
  const themeColors = useThemeColors();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const emptyForm = {
    date: "",
    description: "",
    id: "",
    imageUri: "",
    pdfUri: "",
    maxRegistrations: "",
    googleDriveLink: "",
    registrationUntil: "",
    title: "",
    venue: "",
    minTeamSize: "1",
    maxTeamSize: "1",
    eventType: "solo" as "solo" | "group",
    links: [] as { type?: 'drive' | 'custom'; title: string; url: string }[],
    committees: [] as string[],
    clubs: [] as string[],
  };
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrationCounts, setRegistrationCounts] = useState<
    Record<string, number>
  >({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [eventWinners, setEventWinners] = useState<Record<string, WinnerItem[]>>(
    {},
  );
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [eventSort, setEventSort] = useState<EventSort>("latest-added");
  const [form, setForm] = useState(emptyForm);
  const [initialForm, setInitialForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"eventDate" | "registrationUntil" | null>(null);
  const [pickerValue, setPickerValue] = useState(() => new Date());
  const [submitting, setSubmitting] = useState<boolean | string>(false);
  const [activeSection, setActiveSection] = useState<"view" | "create">("create");
  const [rawImageUri, setRawImageUri] = useState("");
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [activePreviewModal, setActivePreviewModal] = useState<"image" | "pdf" | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleSaveImage = async (uri: string) => {
    try {
      if (Platform.OS === "web") {
        Linking.openURL(uri);
        return;
      }
      let localUri = uri;
      if (uri.startsWith("http")) {
        const filename = uri.split("/").pop() || "event_image.jpg";
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        const { uri: downloadedUri } = await FileSystem.downloadAsync(uri, fileUri);
        localUri = downloadedUri;
      }
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === "granted") {
        await MediaLibrary.saveToLibraryAsync(localUri);
        showAlert({ title: "Success", message: "Image saved to your camera roll successfully!", tone: "success" });
      } else {
        showAlert({ title: "Permission required", message: "Please allow photo library access to save images.", tone: "warning" });
      }
    } catch (e) {
      showAlert({ title: "Error", message: "Could not save image.", tone: "error" });
    }
  };

  const handleShareImage = async (uri: string) => {
    try {
      await Share.share({
        url: uri,
        message: `Check out this event image: ${uri}`,
        title: "Event Image",
      });
    } catch (e) {
      showAlert({ title: "Error", message: "Could not share image.", tone: "error" });
    }
  };

  const [previewScale, setPreviewScale] = useState(1);
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const previewPanRef = useRef({ x: 0, y: 0 });
  const initialDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);

  const getDistance = (touches: any[]) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const previewPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistRef.current = getDistance(touches);
          initialScaleRef.current = previewScale;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (initialDistRef.current && initialDistRef.current > 0) {
            const currentDist = getDistance(touches);
            const multiplier = currentDist / initialDistRef.current;
            const newScale = Math.max(1, Math.min(5.0, initialScaleRef.current * multiplier));
            setPreviewScale(newScale);
          }
        } else if (touches.length === 1 && previewScale > 1) {
          setPreviewPan({
            x: previewPanRef.current.x + gestureState.dx,
            y: previewPanRef.current.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        previewPanRef.current = { x: previewPan.x, y: previewPan.y };
        initialDistRef.current = null;
        initialScaleRef.current = previewScale;
      },
      onPanResponderTerminate: () => {
        previewPanRef.current = { x: previewPan.x, y: previewPan.y };
        initialDistRef.current = null;
        initialScaleRef.current = previewScale;
      },
    })
  ).current;

  const resetPreviewZoom = () => {
    setPreviewScale(1);
    setPreviewPan({ x: 0, y: 0 });
    previewPanRef.current = { x: 0, y: 0 };
  };

  const loadEvents = useCallback(async () => {
    const rows = await eventService.searchEvents("");
    setEvents(rows);
    const eventIds = rows.map((event) => event.id);
    const [counts, gCounts, winnersByEvent] = await Promise.all([
      eventService.listRegistrationCounts(eventIds),
      eventService.listGroupCounts(eventIds),
      winnerService.listWinnersByEventIds(eventIds),
    ]);
    setRegistrationCounts(counts);
    setGroupCounts(gCounts);
    setEventWinners(winnersByEvent);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        try {
          setLoading(true);
          await loadEvents();
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [loadEvents]),
  );

  const visibleEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();
    const now = Date.now();

    return events
      .filter((event) => {
        if (query) {
          const searchable = `${event.title} ${event.description} ${event.venue}`.toLowerCase();
          if (!searchable.includes(query)) {
            return false;
          }
        }

        if (eventFilter === "all") {
          return true;
        }

        const eventTime = new Date(event.date).getTime();
        return eventFilter === "upcoming"
          ? eventTime >= now
          : eventTime < now;
      })
      .sort((a, b) => {
        if (eventSort === "az") {
          return a.title.localeCompare(b.title);
        }

        if (eventSort === "latest-added") {
          const first = new Date(a.created_at).getTime();
          const second = new Date(b.created_at).getTime();
          return second - first;
        }

        const first = new Date(a.date).getTime();
        const second = new Date(b.date).getTime();
        return eventSort === "soonest" ? first - second : second - first;
      });
  }, [eventFilter, eventSearch, eventSort, events]);

  const isFormReady = useMemo(
    () =>
      Boolean(
        (form?.title || "").trim() &&
        (form?.description || "").trim() &&
        (form?.date || "").trim() &&
        (form?.venue || "").trim(),
      ),
    [form?.date, form?.description, form?.title, form?.venue],
  );

  const hasFormValue = useMemo(
    () =>
      Boolean(
        form?.id ||
        (form?.title || "").trim() ||
        (form?.description || "").trim() ||
        (form?.date || "").trim() ||
        (form?.venue || "").trim() ||
        (form?.imageUri || "").trim() ||
        (form?.googleDriveLink || "").trim(),
      ),
    [
      form?.date,
      form?.description,
      form?.id,
      form?.imageUri,
      form?.googleDriveLink,
      form?.title,
      form?.venue,
    ],
  );

  const isUpdateDirty = useMemo(() => {
    if (!form.id) {
      return true;
    }

    return (
      form.title !== initialForm.title ||
      form.description !== initialForm.description ||
      form.date !== initialForm.date ||
      form.registrationUntil !== initialForm.registrationUntil ||
      form.venue !== initialForm.venue ||
      form.imageUri !== initialForm.imageUri ||
      form.pdfUri !== initialForm.pdfUri ||
      form.maxRegistrations !== initialForm.maxRegistrations ||
      form.googleDriveLink !== initialForm.googleDriveLink ||
      form.minTeamSize !== initialForm.minTeamSize ||
      form.maxTeamSize !== initialForm.maxTeamSize ||
      form.eventType !== initialForm.eventType ||
      JSON.stringify(form.links) !== JSON.stringify(initialForm.links) ||
      JSON.stringify(form.committees) !== JSON.stringify(initialForm.committees) ||
      JSON.stringify(form.clubs) !== JSON.stringify(initialForm.clubs)
    );
  }, [form, initialForm]);

  const registrationDeadlinePreview = useMemo(() => {
    if (!form.registrationUntil) {
      return "No separate registration deadline set";
    }

    const parsed = new Date(form.registrationUntil);
    if (Number.isNaN(parsed.getTime())) {
      return form.registrationUntil;
    }

    return formatEventDate(parsed.toISOString());
  }, [form.registrationUntil]);

  const formImagePreview = useMemo(() => {
    if (form.imageUri === "remove") return "";
    if (form.imageUri) {
      return form.imageUri;
    }

    if (!form.id) {
      return "";
    }

    return events.find((event) => event.id === form.id)?.image_url ?? "";
  }, [events, form.id, form.imageUri]);

  const formPdfPreview = useMemo(() => {
    if (form.pdfUri === "remove") return "";
    if (form.pdfUri) {
      return form.pdfUri;
    }

    if (!form.id) {
      return "";
    }

    return events.find((event) => event.id === form.id)?.pdf_url ?? "";
  }, [events, form.id, form.pdfUri]);

  const formDatePreview = useMemo(() => {
    if (!form.date) {
      return "Select the event date and time";
    }

    const parsed = new Date(form.date);
    if (Number.isNaN(parsed.getTime())) {
      return form.date;
    }

    return formatEventDate(parsed.toISOString());
  }, [form.date]);

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
    return <LoadingState fullScreen message="Loading event operations..." />;
  }

  const chooseImage = async () => {
    const currentPermission =
      await ImagePicker.getMediaLibraryPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        const openSettings = await showConfirm({
          cancelLabel: "Not now",
          confirmLabel: "Open Settings",
          message:
            "Photo access is blocked for this app. Open device settings and allow media access to upload event images.",
          title: "Permission blocked",
          tone: "warning",
        });

        if (openSettings) {
          await Linking.openSettings();
        }
        return;
      }

      await showAlert({
        message: "Allow media access to upload event images.",
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
      setShowBannerEditor(true);
    }
  };

  const openDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setForm((prev) => ({ ...prev, pdfUri: result.assets[0].uri }));
      }
    } catch (err) {
      await showAlert({
        message: "Could not select PDF document.",
        title: "Error",
        tone: "warning",
      });
    }
  };

  const openPicker = (
    mode: "date" | "time",
    target: "eventDate" | "registrationUntil" = "eventDate",
  ) => {
    const value = target === "registrationUntil" ? form.registrationUntil : form.date;
    const parsed = value ? new Date(value) : new Date();
    setPickerValue(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
    setPickerTarget(target);
    setPickerMode(mode);
  };

  const handlePickerChange = (event: DateTimePickerEvent, nextValue?: Date) => {
    if (Platform.OS === "android") {
      setPickerMode(null);
    }

    if (event.type === "dismissed") {
      return;
    }

    if (!nextValue) {
      return;
    }

    const updated = new Date(pickerValue);
    if (pickerMode === "date") {
      updated.setFullYear(
        nextValue.getFullYear(),
        nextValue.getMonth(),
        nextValue.getDate(),
      );
    } else if (pickerMode === "time") {
      updated.setHours(nextValue.getHours(), nextValue.getMinutes(), 0, 0);
    }

    setPickerValue(updated);
    setForm((prev) =>
      pickerTarget === "registrationUntil"
        ? { ...prev, registrationUntil: updated.toISOString() }
        : { ...prev, date: updated.toISOString() },
    );

    if (
      Platform.OS === "android" &&
      pickerMode === "date" &&
      event.type === "set"
    ) {
      setTimeout(() => setPickerMode("time"), 100);
    }
  };

  const handleSave = async () => {
    const missing = [];
    if (!(form?.title || "").trim()) missing.push("Event Title");
    if (!(form?.description || "").trim()) missing.push("Description");
    if (!(form?.date || "").trim()) missing.push("Date & time");
    if (!(form?.venue || "").trim()) missing.push("Venue");

    if (missing.length > 0 || !profile?.id) {
      await showAlert({
        message: `Please fill in the following required fields before saving:\n\n• ${missing.length > 0 ? missing.join("\n• ") : "User Profile ID"}`,
        title: "Required Fields Missing",
        tone: "warning",
      });
      return;
    }

    if (Boolean(form.id) && !isUpdateDirty) {
      await showAlert({
        message: "No changes detected. Modify any field to update this event.",
        title: "No Changes",
        tone: "default",
      });
      return;
    }

    try {
      setSubmitting(form.id ? "Updating event..." : "Creating event...");
      const minSz = form.eventType === "solo" ? 1 : Number(form.minTeamSize || 1);
      const maxSz = form.eventType === "solo" ? 1 : Number(form.maxTeamSize || 1);
      const onProgress = (msg: string) => setSubmitting(msg);
      if (form.id) {
        await eventService.updateEvent(form.id, {
          ...form,
          minTeamSize: minSz,
          maxTeamSize: maxSz,
          links: form.links,
          committees: form.committees,
          clubs: form.clubs,
        }, onProgress);
      } else {
        await eventService.createEvent({
          created_by: profile.id,
          date: form.date,
          description: form.description,
          imageUri: form.imageUri,
          pdfUri: form.pdfUri,
          googleDriveLink: form.googleDriveLink,
          links: form.links,
          registrationUntil: form.registrationUntil,
          minTeamSize: minSz,
          maxTeamSize: maxSz,
          title: form.title,
          venue: form.venue,
          committees: form.committees,
          clubs: form.clubs,
        }, onProgress);
      }
      setForm(emptyForm);
      setInitialForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      await loadEvents();
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
        title: "Unable to save event",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackEvent = (eventId: string) => {
    router.push({
      pathname: "/events/[id]/registrations",
      params: { id: eventId },
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
        <Text style={[styles.title, { color: themeColors.text }]}>{t("eventOperations")}</Text>
        <Text style={[styles.subtitle, { color: themeColors.muted }]}>{t("eventOperationsIntro")}</Text>

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
              {t("createEvent")}
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
              {t("allEvents")}
            </Text>
          </Pressable>
        </View>

        {activeSection === "create" ? (
        <Panel style={[styles.section, styles.formSection]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            {form.id ? "Edit event" : "Create event"}
          </Text>
          <TextField
            label="Title"
            placeholder="Marketing Conclave 2026"
            value={form.title}
            onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
          />
          <TextField
            label="Description"
            multiline
            placeholder="Describe the event agenda, registration process, and participation rules"
            value={form.description}
            onChangeText={(description) =>
              setForm((prev) => ({ ...prev, description }))
            }
          />
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Date & time</Text>
            <View style={styles.dateActions}>
              <Pressable
                onPress={() => openPicker("date")}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonLabel}>Pick date</Text>
              </Pressable>
              <Pressable
                onPress={() => openPicker("time")}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonLabel}>Pick time</Text>
              </Pressable>
            </View>
            <Text style={[styles.datePreview, { color: themeColors.muted }]}>{formDatePreview}</Text>
            {pickerMode ? (
              <View
                style={Platform.OS === "ios" ? styles.iosPickerContainer : null}
              >
                {Platform.OS === "ios" && (
                  <View style={styles.iosPickerHeader}>
                    <Pressable
                      onPress={() => setPickerMode(null)}
                      style={styles.doneButton}
                    >
                      <Text style={[styles.doneButtonText, { color: themeColors.primary }]}>Done</Text>
                    </Pressable>
                  </View>
                )}
                <DateTimePicker
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  mode={pickerMode}
                  onChange={handlePickerChange}
                  value={pickerValue}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Registration deadline</Text>
            <View style={styles.dateActions}>
              <Pressable
                onPress={() => openPicker("date", "registrationUntil")}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonLabel}>Pick date</Text>
              </Pressable>
              <Pressable
                onPress={() => openPicker("time", "registrationUntil")}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonLabel}>Pick time</Text>
              </Pressable>
              <Pressable
                onPress={() => setForm((prev) => ({ ...prev, registrationUntil: "" }))}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonLabel}>Clear</Text>
              </Pressable>
            </View>
            <Text style={[styles.datePreview, { color: themeColors.muted }]}>{registrationDeadlinePreview}</Text>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Committees (Optional)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {COMMITTEES_LIST.map((committee) => {
                const isSelected = form.committees?.includes(committee);
                return (
                  <Pressable
                    key={committee}
                    onPress={() => {
                      setForm((prev) => ({
                        ...prev,
                        committees: isSelected
                          ? prev.committees.filter((c) => c !== committee)
                          : [...prev.committees, committee],
                      }));
                    }}
                  >
                    <Pill label={committee} tone={isSelected ? "brand" : "dark"} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Clubs (Optional)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {CLUBS_LIST.map((club) => {
                const isSelected = form.clubs?.includes(club);
                return (
                  <Pressable
                    key={club}
                    onPress={() => {
                      setForm((prev) => ({
                        ...prev,
                        clubs: isSelected
                          ? prev.clubs.filter((c) => c !== club)
                          : [...prev.clubs, club],
                      }));
                    }}
                  >
                    <Pill label={club} tone={isSelected ? "brand" : "dark"} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Google Drive Photo Gallery Link (Optional)"
                placeholder="https://drive.google.com/drive/folders/..."
                value={form?.googleDriveLink || ""}
                onChangeText={(googleDriveLink) => setForm((prev) => ({ ...prev, googleDriveLink }))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Pressable
              onPress={() => setForm(prev => {
                const driveCount = prev.links.filter(l => l.type === 'drive').length + 2;
                return { ...prev, links: [...prev.links, { type: 'drive', title: `Google Drive Album ${driveCount}`, url: '' }] }
              })}
              style={{ width: 44, height: 44, marginBottom: 4, backgroundColor: themeColors.primarySoft, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: themeColors.primary + "30" }}
            >
              <Ionicons name="add" size={20} color={themeColors.primary} />
            </Pressable>
          </View>
          {form.links.map((link, idx) => link.type === 'drive' ? (
            <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <TextField
                  label=""
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={link.url}
                  onChangeText={(val) => {
                    const newLinks = [...form.links];
                    newLinks[idx].url = val;
                    setForm(prev => ({ ...prev, links: newLinks }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <Pressable
                onPress={() => {
                  const newLinks = [...form.links];
                  newLinks.splice(idx, 1);
                  setForm(prev => ({ ...prev, links: newLinks }));
                }}
                style={{ width: 44, height: 44, backgroundColor: '#FEE2E2', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="trash" size={20} color="#EF4444" />
              </Pressable>
            </View>
          ) : null)}
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontFamily: typography.semiBold, color: themeColors.text, marginBottom: 8 }}>
              Custom Links (Optional)
            </Text>
            {form.links.map((link, idx) => link.type !== 'drive' ? (
              <View key={idx} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label=""
                    placeholder="Title (e.g. Rulebook)"
                    value={link.title}
                    onChangeText={(val) => {
                      const newLinks = [...form.links];
                      newLinks[idx].title = val;
                      setForm(prev => ({ ...prev, links: newLinks }));
                    }}
                  />
                </View>
                <View style={{ flex: 1.5 }}>
                  <TextField
                    label=""
                    placeholder="URL (https://...)"
                    value={link.url}
                    onChangeText={(val) => {
                      const newLinks = [...form.links];
                      newLinks[idx].url = val;
                      setForm(prev => ({ ...prev, links: newLinks }));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Pressable
                  onPress={() => {
                    const newLinks = [...form.links];
                    newLinks.splice(idx, 1);
                    setForm(prev => ({ ...prev, links: newLinks }));
                  }}
                  style={{ width: 44, height: 44, backgroundColor: '#FEE2E2', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </Pressable>
              </View>
            ) : null)}
            <PrimaryButton
              label="+ Add Custom Link"
              onPress={() => setForm(prev => ({ ...prev, links: [...prev.links, { type: 'custom', title: '', url: '' }] }))}
              variant="secondary"
            />
          </View>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontFamily: typography.semiBold, color: themeColors.text, marginBottom: 8 }}>
              Event Participation Type
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <PrimaryButton
                label="Solo / Individual (1 Person)"
                onPress={() => setForm(prev => ({ ...prev, eventType: "solo", minTeamSize: "1", maxTeamSize: "1" }))}
                variant={form.eventType === "solo" ? "primary" : "secondary"}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label="Group / Team Event"
                onPress={() => setForm(prev => ({ ...prev, eventType: "group", minTeamSize: "2", maxTeamSize: "4" }))}
                variant={form.eventType === "group" ? "primary" : "secondary"}
                style={{ flex: 1 }}
              />
            </View>
          </View>
          {form.eventType === "group" ? (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  label="Min Participants / Group Size"
                  placeholder="2"
                  value={form.minTeamSize}
                  onChangeText={(minTeamSize) => setForm((prev) => ({ ...prev, minTeamSize }))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextField
                  keyboardType="numeric"
                  label="Max Participants / Group Size"
                  placeholder="4"
                  value={form.maxTeamSize}
                  onChangeText={(maxTeamSize) => setForm((prev) => ({ ...prev, maxTeamSize }))}
                />
              </View>
            </View>
          ) : null}
          <TextField
            label="Venue"
            placeholder="Jaipuria Auditorium, Indore"
            value={form.venue}
            onChangeText={(venue) => setForm((prev) => ({ ...prev, venue }))}
          />
          <TextField
            keyboardType="numeric"
            label="Max Registrations / Seat Capacity (Optional)"
            placeholder="e.g. 50 (Leave blank for unlimited capacity)"
            value={form.maxRegistrations || ""}
            onChangeText={(maxRegistrations) => setForm((prev) => ({ ...prev, maxRegistrations }))}
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
            <PrimaryButton
              label={form.imageUri ? "Image selected" : "Pick Event Image"}
              onPress={() => void chooseImage()}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label={form.pdfUri ? "PDF Selected" : "Attach PDF"}
              onPress={() => void openDocumentPicker()}
              variant="secondary"
              icon="doc"
              style={{ flex: 1 }}
            />
          </View>
          {formImagePreview || formPdfPreview ? (
            <View style={{ gap: 12, marginTop: 12, marginBottom: 8 }}>
              {formImagePreview ? (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: themeColors.border, position: "relative" }}>
                  <Pressable onPress={() => setActivePreviewModal("image")} style={{ position: "relative", width: 90, height: 90, borderRadius: 12, overflow: "hidden", backgroundColor: "#0F172A" }}>
                    <Image source={{ uri: formImagePreview }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
                    <View style={{ position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(0,0,0,0.6)", padding: 4, borderRadius: 8 }}>
                      <Ionicons name="expand" size={14} color="#FFF" />
                    </View>
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 16, marginRight: 36 }}>
                    <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.text }}>Event Image Banner</Text>
                    <Text style={{ fontSize: 13, color: themeColors.muted, marginTop: 4 }}>Tap thumbnail to view full screen</Text>
                  </View>
                  <Pressable onPress={() => setForm(prev => ({ ...prev, imageUri: "remove" }))} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FCA5A5" }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ) : null}

              {formPdfPreview ? (
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: themeColors.border, position: "relative" }}>
                  <Pressable onPress={() => setActivePreviewModal("pdf")} style={{ width: 90, height: 90, borderRadius: 12, backgroundColor: "#EFF6FF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#BFDBFE" }}>
                    <Ionicons name="document-text" size={38} color="#3B82F6" />
                    <View style={{ position: "absolute", bottom: 4, right: 4, backgroundColor: "rgba(59, 130, 246, 0.8)", padding: 4, borderRadius: 8 }}>
                      <Ionicons name="expand" size={14} color="#FFF" />
                    </View>
                  </Pressable>
                  <View style={{ flex: 1, marginLeft: 16, marginRight: 36 }}>
                    <Text style={{ fontSize: 16, fontFamily: typography.bold, color: themeColors.text }}>Attached PDF Document</Text>
                    <Text style={{ fontSize: 13, color: themeColors.muted, marginTop: 4 }}>Tap thumbnail to view full screen</Text>
                  </View>
                  <Pressable onPress={() => setForm(prev => ({ ...prev, pdfUri: "remove" }))} style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FCA5A5" }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.formActions}>
            {form.id ? (
              <PrimaryButton
                disabled={!hasFormValue || !!submitting}
                label="Cancel Edit"
                onPress={() => {
                  setForm(emptyForm);
                  setInitialForm(emptyForm);
                  setPickerMode(null);
                  setPickerTarget(null);
                }}
                variant="ghost"
              />
            ) : null}
            <PrimaryButton
              disabled={!!submitting}
              loading={!!submitting}
              icon={form.id ? "checkmark" : undefined}
              label={
                typeof submitting === "string"
                  ? submitting
                  : submitting
                    ? form.id
                      ? "Updating Event..."
                      : "Creating Event..."
                    : form.id
                      ? "Update Event"
                      : "Create Event"
              }
              onPress={handleSave}
            />
          </View>
        </Panel>
        ) : null}

        {activeSection === "view" ? (
          <>
        <View style={styles.listHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{t("allEvents")}</Text>
            <Text style={[styles.listMeta, { color: themeColors.muted }]}>
              Showing {visibleEvents.length} of {events.length}
            </Text>
          </View>
        </View>



        <Panel style={styles.toolbar}>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            label="Search"
            placeholder="Search title, venue, or description"
            value={eventSearch}
            onChangeText={setEventSearch}
          />
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>Filter</Text>
            <View style={styles.chipRow}>
              {eventFilterOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setEventFilter(option.value)}
                  style={[
                    styles.controlChip,
                    eventFilter === option.value && {
                      backgroundColor: themeColors.primary,
                      borderColor: themeColors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.controlChipText,
                      eventFilter === option.value && styles.controlChipTextActive,
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
              {eventSortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setEventSort(option.value)}
                  style={[
                    styles.controlChip,
                    eventSort === option.value && {
                      backgroundColor: themeColors.primary,
                      borderColor: themeColors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.controlChipText,
                      eventSort === option.value && styles.controlChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Panel>

        {events.length === 0 ? (
          <EmptyState
            message="Created events will appear here for tracking, editing, and cleanup."
            title="No events yet"
          />
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            message="Try another search term, event status, or sort option."
            title="No matching events"
          />
        ) : (
          visibleEvents.map((event) => {
            const registrationState = getRegistrationState(event, {
              closed: "#DC2626",
              open: "#16A34A",
            });
            const winners = eventWinners[event.id] ?? [];
            const resultDeclared = winners.length > 0;
            const registrationCount = registrationCounts[event.id] ?? 0;
            const groupCount = groupCounts[event.id] ?? 0;
            const isTeamEvent = (event.max_team_size ?? 1) > 1;

            return (
            <Panel
              key={event.id}
              style={[
                styles.eventCard,
                {
                  borderColor: registrationState.borderColor,
                  borderWidth: 1.5,
                },
              ]}
            >
              <Text
                style={[
                  styles.registrationStatus,
                  { color: registrationState.borderColor },
                ]}
              >
                {registrationState.label}
              </Text>
              {event.image_url ? (
                <Pressable onPress={() => { setPreviewImageUrl(event.image_url!); setActivePreviewModal("image"); }}>
                  <Image
                    contentFit="cover"
                    source={{ uri: event.image_url }}
                    style={styles.eventImage}
                  />
                </Pressable>
              ) : null}
              <View style={styles.cardHeader}>
                <View style={styles.cardText}>
                  <Text style={styles.itemTitle}>{event.title}</Text>
                  <Text style={styles.itemMeta}>
                    {formatEventDate(event.date)} • {event.venue}
                  </Text>
                  {isTeamEvent ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 4 }}>
                      <Pill label={`Group Event • Min: ${event.min_team_size} | Max: ${event.max_team_size} Members`} tone="brand" />
                    </View>
                  ) : (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 4 }}>
                      <Pill label="Solo Event (1 Member)" tone="default" />
                    </View>
                  )}
                  {event.committees && event.committees.length > 0 ? (
                    <View style={{ marginTop: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontFamily: typography.bold, color: themeColors.text, marginBottom: 4 }}>Committees</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {event.committees.map(c => (
                          <View key={c} style={{ backgroundColor: themeColors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {event.clubs && event.clubs.length > 0 ? (
                    <View style={{ marginTop: 4, marginBottom: 6 }}>
                      <Text style={{ fontSize: 12, fontFamily: typography.bold, color: themeColors.text, marginBottom: 4 }}>Clubs</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {event.clubs.map(c => (
                          <View key={c} style={{ backgroundColor: themeColors.primarySoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontFamily: typography.semiBold, color: themeColors.primary }}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.resultBlock}>
                    <Text
                      style={[
                        styles.resultStatus,
                        {
                          color: resultDeclared
                            ? themeColors.primary
                            : themeColors.muted,
                        },
                      ]}
                    >
                      {resultDeclared ? "Result declared" : "Result not declared"}
                    </Text>
                    {resultDeclared ? (
                      <Text style={[styles.resultNames, { color: themeColors.muted }]}>
                        {winners
                          .map((winner) => `${winner.position}: ${winner.users?.name ?? winner.name}`)
                          .join(" • ")}
                      </Text>
                    ) : null}
                    {event.google_drive_link ? (
                      <Pressable
                        onPress={() => void Linking.openURL(event.google_drive_link!)}
                        style={[styles.driveBadge, { backgroundColor: "#4285F4" }]}
                      >
                        <IconSymbol color={colors.white} name="paperplane.fill" size={14} />
                        <Text style={[styles.driveBadgeText, { color: colors.white }]}>
                          Google Drive Gallery Attached
                        </Text>
                      </Pressable>
                    ) : null}
                    {event.pdf_url ? (
                      <Pressable
                        onPress={() => { setPreviewPdfUrl(event.pdf_url!); setActivePreviewModal("pdf"); }}
                        style={[styles.driveBadge, { backgroundColor: themeColors.primary, marginTop: 4 }]}
                      >
                        <IconSymbol color={colors.white} name="doc.fill" size={14} />
                        <Text style={[styles.driveBadgeText, { color: colors.white }]}>
                          Attached PDF Document
                        </Text>
                      </Pressable>
                    ) : null}
                    {event.max_registrations ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Math.max(0, event.max_registrations - registrationCount) <= event.max_registrations * 0.25 ? "#EF4444" : themeColors.surfaceAlt, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, gap: 6, borderWidth: 1, borderColor: Math.max(0, event.max_registrations - registrationCount) <= event.max_registrations * 0.25 ? "#FCA5A5" : themeColors.border }}>
                          <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: Math.max(0, event.max_registrations - registrationCount) <= event.max_registrations * 0.25 ? "#FFFFFF" : themeColors.text }}>
                            {`Capacity: ${event.max_registrations} • ${Math.max(0, event.max_registrations - registrationCount)} Seats Left`}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <Pressable
                      onPress={() => void handleTrackEvent(event.id)}
                      style={[
                        styles.countButton,
                        { backgroundColor: themeColors.primarySoft },
                      ]}
                    >
                      <IconSymbol
                        color={themeColors.primary}
                        name={isTeamEvent ? "people-outline" : "person.fill"}
                        size={16}
                      />
                      <Text style={[styles.countMeta, { color: themeColors.primary }]}>
                        {registrationCount} {registrationCount === 1 ? "student" : "students"} {isTeamEvent ? `(${groupCount} ${groupCount === 1 ? "group" : "groups"})` : ""}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleTrackEvent(event.id)}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}
                    >
                      <IconSymbol name="eye.fill" size={18} color={themeColors.primary} />
                    </Pressable>
                  </View>
                </View>
              </View>
              <Text style={styles.itemBody}>{event.description}</Text>
              <View style={{ borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 12, marginTop: 12 }}>
                <Text style={{ fontSize: 11, color: themeColors.muted, marginBottom: 8, fontFamily: typography.medium }}>
                  Operations : ✏️ Edit • {event.registrations_paused ? "▶️ Resume" : "⏸️ Pause"} • 🗑️ Delete
                </Text>
                <View style={styles.actions}>
                  <PrimaryButton
                    icon="pencil"
                    onPress={() => {
                      const nextForm = {
                        date: event.date,
                        description: event.description,
                        id: event.id,
                        imageUri: "",
                        pdfUri: "",
                        maxRegistrations: event.max_registrations ? String(event.max_registrations) : "",
                        googleDriveLink: event.google_drive_link ?? "",
                        links: event.links ?? [],
                        registrationUntil: event.registration_until ?? "",
                        title: event.title,
                        venue: event.venue,
                        minTeamSize: String(event.min_team_size ?? 1),
                        maxTeamSize: String(event.max_team_size ?? 1),
                        eventType: (event.max_team_size ?? 1) > 1 ? "group" : "solo" as "solo" | "group",
                      };
                      setForm(nextForm);
                      setInitialForm(nextForm);
                      setPickerMode(null);
                      setPickerTarget(null);
                      setActiveSection("create");
                      requestAnimationFrame(() => {
                        scrollRef.current?.scrollTo({ animated: true, y: 0 });
                      });
                    }}
                    style={styles.actionButton}
                    variant="secondary"
                  />
                  <PrimaryButton
                    icon={event.registrations_paused ? "play.fill" : "pause.fill"}
                    onPress={async () => {
                      await eventService.setRegistrationsPaused(
                        event.id,
                        !event.registrations_paused,
                      );
                      await queryClient.invalidateQueries({ queryKey: ["events"] });
                      await loadEvents();
                    }}
                    style={styles.actionButton}
                    variant="secondary"
                  />
                  <PrimaryButton
                    icon="trash.fill"
                    onPress={async () => {
                      const confirmed = await showConfirm({
                        confirmLabel: "Delete",
                        message:
                          "This event and its registrations will be removed from the dashboard.",
                        title: "Delete this event?",
                        tone: "warning",
                      });
                      if (!confirmed) {
                        return;
                      }
                      await eventService.deleteEvent(event.id);
                      await queryClient.invalidateQueries({ queryKey: ["events"] });
                      await queryClient.invalidateQueries({
                        queryKey: queryKeys.eventRegistrations(event.id),
                      });
                      await loadEvents();
                    }}
                    style={styles.actionButton}
                    variant="danger"
                  />
                </View>
              </View>
            </Panel>
            );
          })
        )}

          </>
        ) : null}

        <CustomBannerEditorModal
          visible={showBannerEditor}
          rawUri={rawImageUri}
          onCancel={() => setShowBannerEditor(false)}
          onSave={(editedUri) => {
            setForm((prev) => ({ ...prev, imageUri: editedUri }));
            setShowBannerEditor(false);
          }}
        />

        <Modal
          visible={activePreviewModal === "image"}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setActivePreviewModal(null); setPreviewImageUrl(null); resetPreviewZoom(); }}
        >
          <View style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
              <Pressable onPress={() => { setActivePreviewModal(null); setPreviewImageUrl(null); resetPreviewZoom(); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
              </Pressable>
              <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Image Preview</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" }} {...previewPanResponder.panHandlers}>
              {previewImageUrl || formImagePreview ? (
                <Image
                  source={{ uri: previewImageUrl || formImagePreview }}
                  contentFit="contain"
                  style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", transform: [{ scale: previewScale }, { translateX: previewPan.x }, { translateY: previewPan.y }] }}
                />
              ) : null}
            </View>
            <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 24), alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, gap: 16, borderWidth: 1, borderColor: themeColors.border, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
              <Pressable onPress={() => setPreviewScale((s) => Math.min(s + 0.5, 4.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="add" size={22} color={themeColors.primary} />
              </Pressable>
              <Pressable onPress={() => setPreviewScale((s) => Math.max(s - 0.5, 1.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="remove" size={22} color={themeColors.primary} />
              </Pressable>
              <View style={{ width: 1, height: 24, backgroundColor: themeColors.border }} />
              <Pressable onPress={() => void handleSaveImage((previewImageUrl || formImagePreview)!)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="download" size={20} color={themeColors.primary} />
              </Pressable>
              <Pressable onPress={() => void handleShareImage((previewImageUrl || formImagePreview)!)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="share-social" size={20} color={themeColors.primary} />
              </Pressable>
            </View>
            {previewScale > 1 ? (
              <Pressable onPress={resetPreviewZoom} style={{ position: "absolute", top: Math.max(insets.top, 20) + 70, alignSelf: "center", backgroundColor: themeColors.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, zIndex: 20 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: typography.bold }}>Reset Zoom ({previewScale.toFixed(1)}x)</Text>
              </Pressable>
            ) : null}
          </View>
        </Modal>

        <Modal
          visible={activePreviewModal === "pdf"}
          animationType="fade"
          transparent={true}
          onRequestClose={() => { setActivePreviewModal(null); setPreviewPdfUrl(null); }}
        >
          <View style={{ flex: 1, backgroundColor: themeColors.background }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
              <Pressable onPress={() => { setActivePreviewModal(null); setPreviewPdfUrl(null); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
              </Pressable>
              <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Attached Document</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
              <View style={{ backgroundColor: themeColors.surface, padding: 32, borderRadius: 24, alignItems: "center", width: "100%", maxWidth: 400, borderWidth: 1, borderColor: themeColors.border, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <Ionicons name="document-text" size={48} color={themeColors.primary} />
                </View>
                <Text style={{ color: themeColors.text, fontSize: 20, fontFamily: typography.bold, textAlign: "center", marginBottom: 8 }}>
                  Attached PDF Document
                </Text>
                <Text style={{ color: themeColors.muted, fontSize: 14, textAlign: "center", marginBottom: 28, lineHeight: 20 }}>
                  This document is securely attached to the event. Tap below to view or download it directly.
                </Text>
                <PrimaryButton
                  label="Open Document"
                  icon="open"
                  onPress={() => void Linking.openURL((previewPdfUrl || formPdfPreview)!)}
                  style={{ width: "100%", backgroundColor: themeColors.primary }}
                />
              </View>
            </View>
          </View>
        </Modal>

      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
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
  actionButton: {
    width: 48,
    height: 48,
  },
  container: {
    flex: 1,
  },
  dateActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  dateButton: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  dateButtonLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  datePreview: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  cardText: {
    flex: 1,
    marginRight: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
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
  countButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.round,
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  countMeta: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 12,
  },
  registrationStatus: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  eventCard: {
    marginBottom: spacing.md,
  },
  eventImage: {
    borderRadius: 18,
    height: 180,
    marginBottom: spacing.md,
    width: "100%",
  },
  resultBlock: {
    gap: 2,
    marginTop: spacing.xs,
  },
  resultNames: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  resultStatus: {
    color: colors.muted,
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.text,
    fontFamily: typography.medium,
    fontSize: 14,
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  formImagePreview: {
    borderRadius: 18,
    height: 180,
    width: "100%",
  },
  formSection: {
    gap: spacing.md,
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
  itemBody: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  itemMeta: {
    color: colors.muted,
    fontFamily: typography.medium,
    fontSize: 13,
    marginTop: 4,
  },
  itemTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 18,
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxHeight: "88%",
    padding: spacing.md,
    width: "100%",
  },
  modalHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 20,
  },
  modalMeta: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.round,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  modalCloseText: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalList: {
    marginTop: spacing.md,
  },
  modalListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  modalRow: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
  },
  modalRowTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  modalRowName: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.semiBold,
    fontSize: 15,
  },
  modalRowTime: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: 12,
    textAlign: "right",
  },
  modalRowEmail: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
    marginTop: 4,
  },
  previewBlock: {
    gap: spacing.xs,
  },
  previewCaption: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 13,
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
  iosPickerContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  iosPickerHeader: {
    alignItems: "flex-end",
    backgroundColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  doneButton: {
    padding: spacing.xs,
  },
  doneButtonText: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: 16,
  },
  driveBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  driveBadgeText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
});
