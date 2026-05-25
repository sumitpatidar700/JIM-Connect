import { Link, router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
    ScrollView
} from "react-native";

import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TextField } from "@/components/ui/TextField";
import { useAppFeedback } from "@/src/providers/app-feedback-provider";
import { authService } from "@/src/services/auth-service";
import {
    colors,
    radii,
    shadows,
    spacing,
    typography,
} from "@/src/theme/tokens";
import { getResponsiveFontSize } from "@/src/utils/responsive";

export default function ForgotPasswordScreen() {
  const { showAlert } = useAppFeedback();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    try {
      setSubmitting(true);
      await authService.sendPasswordResetEmail(email);
      await showAlert({
        message: "Check your email for the password reset link.",
        title: "Reset link sent",
        tone: "success",
      });
      router.back();
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to send reset link",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Reset Password</Text>
            <Text style={styles.cardSubtitle}>
              Enter your college email to receive a password reset link.
            </Text>
          </View>
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            label="College email"
            placeholder="name@jaipuria.ac.in"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <PrimaryButton
            disabled={!email || submitting}
            label={submitting ? "Sending..." : "Send Reset Link"}
            onPress={handleReset}
          />
          <Link href="/(auth)/login" style={styles.link}>
            Back to Sign In
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 460,
    padding: spacing.lg,
    width: "100%",
    ...shadows.card,
  },
  cardHeader: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(20, 18, 22),
    textAlign: "center",
  },
  cardSubtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: getResponsiveFontSize(14, 13, 15),
    textAlign: "center",
  },
  link: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(15, 14, 16),
    marginTop: spacing.md,
    textAlign: "center",
  },
});
