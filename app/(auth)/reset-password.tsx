import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
    ScrollView
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
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

export default function ResetPasswordScreen() {
  const { showAlert } = useAppFeedback();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async () => {
    if (password !== confirmPassword) {
      await showAlert({
        message: "Passwords do not match.",
        title: "Validation Error",
        tone: "error",
      });
      return;
    }
    
    if (password.length < 6) {
      await showAlert({
        message: "Password must be at least 6 characters long.",
        title: "Validation Error",
        tone: "error",
      });
      return;
    }

    try {
      setSubmitting(true);
      await authService.updatePassword(password);
      await showAlert({
        message: "Your password has been successfully updated. You can now sign in.",
        title: "Password Updated",
        tone: "success",
      });
      router.replace("/(auth)/login");
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to reset password",
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
            <Text style={styles.cardTitle}>Set New Password</Text>
            <Text style={styles.cardSubtitle}>
              Please enter your new password below.
            </Text>
          </View>
          <TextField
            label="New Password"
            placeholder="Enter new password"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            rightIcon={
              <IconSymbol
                name={showPassword ? "eye.slash.fill" : "eye.fill"}
                color={colors.muted}
                size={21}
              />
            }
            rightIconAccessibilityLabel={
              showPassword ? "Hide password" : "Show password"
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />
          <TextField
            label="Confirm New Password"
            placeholder="Re-enter new password"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <PrimaryButton
            disabled={!password || !confirmPassword || submitting}
            label={submitting ? "Updating..." : "Update Password"}
            onPress={handleReset}
          />
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
});
