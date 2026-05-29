import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supportService } from "@/src/services/support-service";
import { storageService } from "@/src/services/storage-service";
import { supabase } from "@/src/lib/supabase";
import { useAuthStore } from "@/src/store/auth-store";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { queryKeys } from "@/src/hooks/queries/query-keys";
import { Panel } from "./Panel";
import { Pill } from "./Pill";
import { PrimaryButton } from "./PrimaryButton";
import { TextField } from "./TextField";
import { IconSymbol } from "./icon-symbol";
import { typography, spacing, radii, colors } from "@/src/theme/tokens";
import { useThemeColors } from "@/src/utils/settings-effects";
import { SupportTicket } from "@/src/types/app";

export function SupportSection() {
  const profile = useAuthStore((state) => state.profile);
  const isAdmin = profile?.role === "admin";
  const themeColors = useThemeColors();
  const { showAlert } = useAppFeedback();
  const queryClient = useQueryClient();
  const router = useRouter();

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

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: queryKeys.supportTickets(profile?.id),
    queryFn: () =>
      isAdmin
        ? supportService.listAllTickets()
        : supportService.listUserTickets(profile?.id ?? ""),
    enabled: Boolean(profile?.id),
  });

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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={[styles.title, { color: themeColors.text }]}>
            {isAdmin ? "User Support Queries" : "Support & Admin Help"}
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

      {isLoading ? (
        <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 20 }} />
      ) : tickets.length === 0 ? (
        <Panel style={[styles.emptyCard, { backgroundColor: themeColors.surfaceAlt }]}>
          <Text style={[styles.emptyText, { color: themeColors.muted }]}>
            {isAdmin ? "No support inquiries submitted yet." : "You have no support inquiries. Need help? Contact admin above!"}
          </Text>
        </Panel>
      ) : (
        <View style={{ gap: 8 }}>
          {tickets.slice(0, 1).map((t) => (
            <TouchableOpacity key={t.id} onPress={() => router.push("/(app)/support")} activeOpacity={0.8}>
              <Panel style={{ padding: 14, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  {isAdmin && t.users ? (
                    <Text numberOfLines={1} style={{ fontSize: 12, fontFamily: typography.semiBold, color: themeColors.primary, marginBottom: 2 }}>
                      {t.users.name} ({t.users.email})
                    </Text>
                  ) : null}
                  <Text numberOfLines={1} style={{ fontSize: 14, fontFamily: typography.semiBold, color: themeColors.text }}>
                    {t.subject}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pill
                    label={t.status === "open" ? "Open" : "Resolved"}
                    tone={t.status === "open" ? "warning" : "success"}
                  />
                  <Ionicons name="chevron-forward" size={16} color={themeColors.muted} />
                </View>
              </Panel>
            </TouchableOpacity>
          ))}

          {tickets.length > 1 ? (
            <TouchableOpacity
              onPress={() => router.push("/(app)/support")}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, paddingVertical: 4, paddingHorizontal: 4 }}
            >
              <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                View all ({tickets.length})
              </Text>
              <Ionicons name="arrow-forward" size={14} color={themeColors.primary} />
            </TouchableOpacity>
          ) : null}
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
      <Modal visible={Boolean(previewImage)} animationType="fade" transparent={true} onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewImage(null)}>
            <IconSymbol name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: Platform.OS === "android" ? 14 : 15,
    fontFamily: typography.semiBold,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    borderRadius: radii.xl,
  },
  emptyText: {
    fontFamily: typography.medium,
    fontSize: 14,
    textAlign: "center",
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
