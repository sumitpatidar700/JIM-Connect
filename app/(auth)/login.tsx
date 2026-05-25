import { Link, router } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    View,
    ImageBackground,
    ScrollView,
    TouchableOpacity,
    Alert,
    Keyboard
} from "react-native";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Screen } from "@/components/ui/Screen";
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
import {
    getResponsiveFontSize,
    useResponsiveDimensions,
} from "@/src/utils/responsive";

export default function LoginScreen() {
  const { isSmallScreen } = useResponsiveDimensions();
  const { showAlert } = useAppFeedback();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    try {
      Keyboard.dismiss();
      setSubmitting(true);
      const response = await authService.signIn({ email: email.trim(), password });
      const profile = response.user
        ? await authService.getProfile(response.user.id)
        : null;
      router.replace(
        profile?.role === "admin"
          ? "/(app)/(tabs)/admin-dashboard"
          : "/(app)/(tabs)",
      );
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to sign in",
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
      <ImageBackground
        source={require("@/assets/images/clg_logo.png")} // Replace with a proper background image if available
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={Platform.OS === "android" ? 60 : 80}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Text style={styles.kicker}>Campus OS</Text>
              <Text style={styles.title}>JI-Connect</Text>
              <Text style={styles.subtitle}>
                Announcements, registrations, winners, repository files, and campus
                updates in one place.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSubtitle}>
                  Use your registered college email.
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
              <TextField
                label="Password"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                textContentType="password"
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
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
              <PrimaryButton
                disabled={!email || !password || submitting}
                label={submitting ? "Signing In..." : "Sign In"}
                onPress={handleLogin}
              />
              <Link href="/(auth)/signup" style={styles.link}>
                Create an account
              </Link>
            </View>

            <View style={styles.logoContainer}>
              <Image
                source={require("@/assets/images/clg_logo.png")}
                style={[styles.logo, isSmallScreen && styles.logoCompact]}
                resizeMode="contain"
              />
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.8)", // Light translucent overlay for readability
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: spacing.md,
  },
  logo: {
    width: "100%",
    maxWidth: 230,
    height: 120,
  },
  logoCompact: {
    maxWidth: 200,
    height: 104,
  },
  hero: {
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
    maxWidth: 480,
    paddingHorizontal: spacing.md,
  },
  kicker: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(14, 12, 15),
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: getResponsiveFontSize(28, 24, 30),
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: getResponsiveFontSize(15, 13, 16),
    lineHeight: 22,
    textAlign: "center",
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
    fontSize: getResponsiveFontSize(18, 16, 19),
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
  forgotPassword: {
    color: colors.primary,
    fontFamily: typography.medium,
    fontSize: getResponsiveFontSize(14, 13, 15),
    textAlign: "right",
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },
});
