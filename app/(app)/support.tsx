import { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  PanResponder,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supportService } from "@/src/services/support-service";
import { storageService } from "@/src/services/storage-service";
import { supabase } from "@/src/lib/supabase";
import { useAuthStore } from "@/src/store/auth-store";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { EmptyState } from "@/components/ui/EmptyState";
import { typography, spacing, radii, colors } from "@/src/theme/tokens";
import { useThemeColors } from "@/src/utils/settings-effects";

export default function SupportScreen() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === "admin";
  const themeColors = useThemeColors();
  const { showAlert } = useAppFeedback();
  const queryClient = useQueryClient();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  const [modalVisible, setModalVisible] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyImageUri, setReplyImageUri] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
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

  const handleShareImage = async () => {
    if (!previewImage) return;
    try {
      await Share.share({
        url: previewImage,
        message: `Support Attachment:\n${previewImage}`,
        title: "Support Attachment",
      });
    } catch (e) {
      showAlert({ title: "Error", message: "Could not share image.", tone: "error" });
    }
  };

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: queryKeys.supportTickets(profile?.id),
    queryFn: () =>
      isAdmin
        ? supportService.listAllTickets()
        : supportService.listUserTickets(profile?.id ?? ""),
    enabled: Boolean(profile?.id),
  });

  useEffect(() => {
    const channel = supportService.subscribeToTickets(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.supportTickets(profile?.id),
      });
    });
    return () => {
      supportService.unsubscribe(channel);
    };
  }, [profile?.id, queryClient]);

  const { data: eventsList = [] } = useQuery({
    queryKey: ["support", "events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .order("date", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const filteredTickets = tickets.filter((t) => {
    if (filter === "open") return t.status === "open";
    if (filter === "resolved") return t.status === "resolved";
    return true;
  });

  const handlePickImage = async (forReply = false) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      if (forReply) {
        setReplyImageUri(result.assets[0].uri);
      } else {
        setImageUri(result.assets[0].uri);
      }
    }
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      await showAlert({
        title: "Missing fields",
        message: "Please enter both a subject and message.",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      let uploadedUrl: string | null = null;
      if (imageUri) {
        uploadedUrl = await storageService.uploadImage(
          "support-assets",
          "tickets",
          imageUri,
        );
      }

      await supportService.createTicket({
        user_id: profile?.id ?? "",
        event_id: selectedEventId,
        subject: subject.trim(),
        message: message.trim(),
        image_url: uploadedUrl,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.supportTickets(profile?.id),
      });

      setModalVisible(false);
      setSubject("");
      setMessage("");
      setSelectedEventId(null);
      setImageUri(null);

      await showAlert({
        title: "Ticket Submitted",
        message: "Your message has been sent to the admin team.",
        tone: "success",
      });
    } catch (error: any) {
      await showAlert({
        title: "Submission Failed",
        message: error.message || "Could not submit support ticket.",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    if (!replyMessage.trim()) {
      await showAlert({
        title: "Missing reply",
        message: "Please enter a reply message.",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmittingReply(true);
      let uploadedUrl: string | null = null;
      if (replyImageUri) {
        uploadedUrl = await storageService.uploadImage(
          "support-assets",
          "replies",
          replyImageUri,
        );
      }

      await supportService.replyTicket(ticketId, replyMessage.trim(), uploadedUrl);

      await queryClient.invalidateQueries({
        queryKey: queryKeys.supportTickets(profile?.id),
      });

      setReplyingTicketId(null);
      setReplyMessage("");
      setReplyImageUri(null);

      await showAlert({
        title: "Reply Sent",
        message: "The user's ticket has been updated and resolved.",
        tone: "success",
      });
    } catch (error: any) {
      await showAlert({
        title: "Reply Failed",
        message: error.message || "Could not submit reply.",
        tone: "error",
      });
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 2 }}>
              <Ionicons name="chevron-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.screenTitle, { color: themeColors.text }]}>
              {isAdmin ? "User Support Inquiries" : "Support Inquiries"}
            </Text>
          </View>
          {!isAdmin && (
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 6 }}
            >
              <IconSymbol name="plus" size={16} color={themeColors.primary} />
              <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                Contact Admin
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.screenSubtitle, { color: themeColors.muted }]}>
          {isAdmin ? "Review and respond to questions and issues reported by students." : "Manage and track all your support inquiries with the admin team."}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity onPress={() => setFilter("all")} activeOpacity={0.8}>
            <Pill label={`All (${tickets.length})`} tone={filter === "all" ? "brand" : "default"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter("open")} activeOpacity={0.8}>
            <Pill label={`Open (${tickets.filter((t) => t.status === "open").length})`} tone={filter === "open" ? "brand" : "default"} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilter("resolved")} activeOpacity={0.8}>
            <Pill label={`Resolved (${tickets.filter((t) => t.status === "resolved").length})`} tone={filter === "resolved" ? "brand" : "default"} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={themeColors.primary} style={{ marginVertical: 40 }} />
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          title="No Inquiries Found"
          message={filter === "all" ? "No support inquiries submitted yet." : `No inquiries match the '${filter}' filter.`}
        />
      ) : (
        <View style={{ gap: 14, paddingBottom: 40 }}>
          {filteredTickets.map((t) => (
            <Panel key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View style={{ flex: 1 }}>
                  {isAdmin && t.users && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      {t.users.avatar_url ? (
                        <Image source={{ uri: t.users.avatar_url }} style={{ width: 24, height: 24, borderRadius: 12 }} />
                      ) : (
                        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 10, fontFamily: typography.semiBold, color: themeColors.primary }}>
                            {t.users.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text }}>
                        {t.users.name} <Text style={{ fontFamily: typography.regular, color: themeColors.muted }}>({t.users.email})</Text>
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.ticketSubject, { color: themeColors.text }]}>{t.subject}</Text>
                  {t.events?.title && (
                    <Text style={[styles.eventTag, { color: themeColors.primary }]}>Event: {t.events.title}</Text>
                  )}
                </View>
                <Pill
                  label={t.status === "open" ? "Open" : "Resolved"}
                  tone={t.status === "open" ? "warning" : "success"}
                />
              </View>

              <Text style={[styles.ticketMessage, { color: themeColors.muted }]}>{t.message}</Text>

              {t.image_url && (
                <TouchableOpacity
                  onPress={() => setPreviewImage(t.image_url ?? null)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 4, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: themeColors.primarySoft, borderRadius: 12 }}
                >
                  <IconSymbol name="photo" size={14} color={themeColors.primary} />
                  <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.primary }}>
                    View Attachment
                  </Text>
                </TouchableOpacity>
              )}

              {t.admin_reply ? (
                <View style={[styles.replyBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <IconSymbol name="checkmark" size={16} color="#10B981" />
                    <Text style={{ fontSize: 12, fontFamily: typography.bold, color: themeColors.text }}>Admin Response</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: typography.regular, color: themeColors.text, lineHeight: 18 }}>
                    {t.admin_reply}
                  </Text>
                  {t.admin_reply_image_url && (
                    <TouchableOpacity
                      onPress={() => setPreviewImage(t.admin_reply_image_url ?? null)}
                      activeOpacity={0.8}
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: themeColors.primarySoft, borderRadius: 12 }}
                    >
                      <IconSymbol name="photo" size={14} color={themeColors.primary} />
                      <Text style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.primary }}>
                        View Admin Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : isAdmin && t.status === "open" ? (
                replyingTicketId === t.id ? (
                  <View style={[styles.replyForm, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text, marginBottom: 8 }}>
                      Reply to User
                    </Text>
                    <TextField
                      label=""
                      placeholder="Type your reply to the user..."
                      value={replyMessage}
                      onChangeText={setReplyMessage}
                      multiline
                      style={{ minHeight: 70 }}
                    />
                    {replyImageUri && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 }}>
                        <Image source={{ uri: replyImageUri }} style={{ width: 50, height: 50, borderRadius: radii.md }} />
                        <TouchableOpacity onPress={() => setReplyImageUri(null)}>
                          <IconSymbol name="trash.fill" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                      <TouchableOpacity onPress={() => void handlePickImage(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: themeColors.surfaceAlt, borderRadius: radii.md }}>
                        <IconSymbol name="camera" size={16} color={themeColors.primary} />
                        <Text style={{ fontSize: 12, fontFamily: typography.medium, color: themeColors.primary }}>Attach Photo</Text>
                      </TouchableOpacity>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <PrimaryButton
                          label="Cancel"
                          onPress={() => { setReplyingTicketId(null); setReplyMessage(""); setReplyImageUri(null); }}
                          variant="ghost"
                          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                        />
                        <PrimaryButton
                          label={submittingReply ? "Sending..." : "Send Reply"}
                          disabled={submittingReply}
                          onPress={() => void handleReplyTicket(t.id)}
                          style={{ paddingHorizontal: 14, paddingVertical: 6 }}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <PrimaryButton
                    label="Reply & Resolve"
                    onPress={() => { setReplyingTicketId(t.id); setReplyMessage(""); setReplyImageUri(null); }}
                    variant="secondary"
                    style={{ marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.round }}
                  />
                )
              ) : null}
            </Panel>
          ))}
        </View>
      )}

      {/* Create Ticket Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>New Support Inquiry</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <IconSymbol name="close" size={24} color={themeColors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 14, paddingVertical: 8 }}>
                <TextField
                  label="Subject"
                  placeholder="Summary of your issue or question"
                  value={subject}
                  onChangeText={setSubject}
                />

                <View>
                  <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text, marginBottom: 6 }}>
                    Related Event (Optional)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <TouchableOpacity onPress={() => setSelectedEventId(null)} activeOpacity={0.8}>
                      <Pill label="General Inquiry" tone={selectedEventId === null ? "brand" : "default"} />
                    </TouchableOpacity>
                    {eventsList.map((e) => (
                      <TouchableOpacity key={e.id} onPress={() => setSelectedEventId(e.id)} activeOpacity={0.8}>
                        <Pill label={e.title} tone={selectedEventId === e.id ? "brand" : "default"} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TextField
                  label="Message"
                  placeholder="Describe your issue or question in detail..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  style={{ minHeight: 90 }}
                />

                <View>
                  <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.text, marginBottom: 6 }}>
                    Attachment (Optional)
                  </Text>
                  {imageUri ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Image source={{ uri: imageUri }} style={{ width: 70, height: 70, borderRadius: radii.md }} />
                      <TouchableOpacity onPress={() => setImageUri(null)} style={{ padding: 8, backgroundColor: "#EF444415", borderRadius: radii.round }}>
                        <IconSymbol name="trash.fill" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => void handlePickImage(false)} style={[styles.attachButton, { backgroundColor: themeColors.surfaceAlt, borderColor: themeColors.border }]}>
                      <IconSymbol name="camera" size={20} color={themeColors.primary} />
                      <Text style={{ fontSize: 13, fontFamily: typography.medium, color: themeColors.primary }}>
                        Attach a Photo or Screenshot
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <PrimaryButton
                label="Cancel"
                onPress={() => setModalVisible(false)}
                variant="ghost"
                style={{ flex: 1 }}
              />
              <PrimaryButton
                label={submitting ? "Submitting..." : "Submit Inquiry"}
                disabled={submitting}
                onPress={() => void handleSubmitTicket()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={Boolean(previewImage)} animationType="fade" transparent={true} onRequestClose={() => { setPreviewImage(null); resetPreviewZoom(); }}>
        <View style={{ flex: 1, backgroundColor: themeColors.background }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: Math.max(insets.top, 20), paddingHorizontal: 16, paddingBottom: 16, backgroundColor: themeColors.surfaceAlt, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1, borderBottomColor: themeColors.border, zIndex: 10, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8 }}>
            <Pressable onPress={() => { setPreviewImage(null); resetPreviewZoom(); }} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
            </Pressable>
            <Text style={{ color: themeColors.text, fontSize: 18, fontFamily: typography.bold }}>Image Preview</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16, overflow: "hidden" }} {...previewPanResponder.panHandlers}>
            {previewImage && (
              <Image
                source={{ uri: previewImage }}
                resizeMode="contain"
                style={{ width: "100%", height: "100%", borderRadius: 24, overflow: "hidden", transform: [{ scale: previewScale }, { translateX: previewPan.x }, { translateY: previewPan.y }] }}
              />
            )}
          </View>
          <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 24), alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: themeColors.surfaceAlt, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, gap: 16, borderWidth: 1, borderColor: themeColors.border, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}>
            <Pressable onPress={() => setPreviewScale((s) => Math.min(s + 0.5, 4.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add" size={22} color={themeColors.primary} />
            </Pressable>
            <Pressable onPress={() => setPreviewScale((s) => Math.max(s - 0.5, 1.0))} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="remove" size={22} color={themeColors.primary} />
            </Pressable>
            <View style={{ width: 1, height: 24, backgroundColor: themeColors.border }} />
            <Pressable onPress={() => void handleShareImage()} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primarySoft, alignItems: "center", justifyContent: "center" }}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: Platform.OS === "android" ? 20 : 24,
    fontFamily: typography.bold,
  },
  screenSubtitle: {
    fontSize: 13,
    fontFamily: typography.regular,
    lineHeight: 18,
  },
  filterContainer: {
    marginBottom: spacing.lg,
  },
  ticketCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    gap: 8,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  ticketSubject: {
    fontSize: 16,
    fontFamily: typography.semiBold,
    marginBottom: 2,
  },
  eventTag: {
    fontSize: 12,
    fontFamily: typography.medium,
  },
  ticketMessage: {
    fontSize: 14,
    fontFamily: typography.regular,
    lineHeight: 20,
    marginTop: 4,
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginTop: 6,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 4,
    borderRadius: radii.round,
  },
  replyBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  replyForm: {
    marginTop: 10,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: typography.bold,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  previewImage: {
    width: "100%",
    height: "80%",
  },
});
