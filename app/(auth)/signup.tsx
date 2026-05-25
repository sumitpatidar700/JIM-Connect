import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useState } from "react";
import {
    Image,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    ImageBackground,
    ScrollView,
    Alert,
} from "react-native";

import { CustomPhotoEditorModal } from "@/components/ui/CustomPhotoEditorModal";
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

export default function SignupScreen() {
  const { isSmallScreen } = useResponsiveDimensions();
  const { showAlert } = useAppFeedback();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatarImageUri, setAvatarImageUri] = useState("");
  const [rawImageUri, setRawImageUri] = useState("");
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGallery = async () => {
    const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        await showAlert({
          message: "Photo access is blocked. Open device settings and allow media access.",
          title: "Permission blocked",
          tone: "warning",
        });
        await Linking.openSettings();
        return;
      }
      await showAlert({
        message: "Allow media access to add your profile photo.",
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
      setShowPhotoEditor(true);
    }
  };

  const handleCamera = async () => {
    const currentPermission = await ImagePicker.getCameraPermissionsAsync();
    let permission = currentPermission;

    if (!permission.granted && permission.canAskAgain) {
      permission = await ImagePicker.requestCameraPermissionsAsync();
    }

    if (!permission.granted) {
      if (!permission.canAskAgain) {
        await showAlert({
          message: "Camera access is blocked. Open device settings and allow camera access.",
          title: "Permission blocked",
          tone: "warning",
        });
        await Linking.openSettings();
        return;
      }
      await showAlert({
        message: "Allow camera access to take a profile photo.",
        title: "Permission needed",
        tone: "warning",
      });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ["images"],
      quality: 1.0,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setRawImageUri(result.assets[0].uri);
      setShowPhotoEditor(true);
    }
  };

  const handlePhotoOption = () => {
    Alert.alert(
      "Profile Photo",
      "Select how you would like to add your photo",
      [
        { text: "Take Photo", onPress: () => void handleCamera() },
        { text: "Choose from Gallery", onPress: () => void handleGallery() },
        avatarImageUri
          ? { text: "Remove Photo", style: "destructive", onPress: () => setAvatarImageUri("") }
          : undefined,
        { text: "Cancel", style: "cancel" },
      ].filter(Boolean) as any
    );
  };

  const handleSignup = async () => {
    if (!avatarImageUri) {
      await showAlert({
        message: "Please add a profile photo before creating your account.",
        title: "Profile photo required",
        tone: "warning",
      });
      return;
    }

    try {
      setSubmitting(true);
      await authService.signUp({ avatarImageUri, name, email, password, phone });
      await showAlert({
        message:
          "Your account has been created. If email confirmation is enabled in Supabase, please verify your inbox before signing in.",
        title: "Account created",
        tone: "success",
      });
      router.replace("/(auth)/login");
    } catch (error) {
      await showAlert({
        message: error instanceof Error ? error.message : "Please try again.",
        title: "Unable to sign up",
        tone: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <CustomPhotoEditorModal
        visible={showPhotoEditor}
        rawUri={rawImageUri}
        onCancel={() => setShowPhotoEditor(false)}
        onSave={(editedUri) => {
          setAvatarImageUri(editedUri);
          setShowPhotoEditor(false);
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
        style={styles.container}
      >
      <ImageBackground
        source={require("@/assets/images/clg_logo.png")}
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
              <Text style={styles.kicker}>Join JIM Indore</Text>
              <Text style={styles.title}>Create your JI-Connect account</Text>
              <Text style={styles.subtitle}>
                Register once to access events, announcements, results, and shared
                campus resources.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Student registration</Text>
                <Text style={styles.cardSubtitle}>
                  Enter the details you use on campus.
                </Text>
              </View>
              <View style={styles.photoBlock}>
                <View style={styles.photoPickerWrapper}>
                  <Pressable
                    onPress={handlePhotoOption}
                    style={styles.photoPicker}
                  >
                    {avatarImageUri ? (
                      <Image
                        source={{ uri: avatarImageUri }}
                        style={styles.avatarPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <IconSymbol
                          name="person.crop.circle.fill"
                          color={colors.primary}
                          size={34}
                        />
                      </View>
                    )}
                  </Pressable>
                  <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
                    <Ionicons color={colors.white} name="camera" size={12} />
                  </View>
                </View>
                <View style={styles.photoText}>
                  <Text style={styles.photoTitle}>Profile photo</Text>
                  <Text style={styles.photoHint}>
                    {avatarImageUri
                      ? "Tap photo to change or remove"
                      : "Required for event registrations and winners."}
                  </Text>
                </View>
              </View>
              <TextField
                autoCapitalize="words"
                autoComplete="name"
                label="Full name"
                placeholder="Your full name"
                textContentType="name"
                value={name}
                onChangeText={setName}
              />
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
                autoComplete="tel"
                keyboardType="phone-pad"
                label="Phone number"
                placeholder="Your mobile number"
                textContentType="telephoneNumber"
                value={phone}
                onChangeText={(value) => setPhone(value.replace(/\D/g, "").slice(0, 10))}
              />
              <TextField
                label="Password"
                placeholder="Create a secure password"
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
              <PrimaryButton
                disabled={
                  !name ||
                  !email ||
                  phone.replace(/\D/g, "").length !== 10 ||
                  !password ||
                  !avatarImageUri ||
                  submitting
                }
                label={submitting ? "Creating Account..." : "Create Account"}
                onPress={handleSignup}
              />
              <Link href="/(auth)/login" style={styles.link}>
                Already have an account? Sign in
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
    </>
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
    backgroundColor: "rgba(255, 255, 255, 0.8)",
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
    fontSize: getResponsiveFontSize(24, 21, 27),
    lineHeight: getResponsiveFontSize(30, 27, 34),
    textAlign: "center",
    marginBottom: spacing.xs,
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
  avatarPlaceholder: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    flex: 1,
    justifyContent: "center",
  },
  avatarPreview: {
    height: "100%",
    width: "100%",
  },
  photoBlock: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm,
  },
  photoHint: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: getResponsiveFontSize(12, 11, 13),
    lineHeight: 17,
  },
  photoPickerWrapper: {
    position: "relative",
    height: 70,
    width: 70,
  },
  photoPicker: {
    borderColor: colors.border,
    borderRadius: radii.round,
    borderWidth: 1,
    height: "100%",
    overflow: "hidden",
    width: "100%",
  },
  cameraBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.white,
    borderRadius: 12,
    borderWidth: 2,
    bottom: -2,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 24,
    zIndex: 1,
  },
  photoText: {
    flex: 1,
  },
  photoTitle: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(14, 13, 15),
    marginBottom: 2,
  },
  link: {
    color: colors.primary,
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(15, 14, 16),
    marginTop: spacing.md,
    textAlign: "center",
  },
});
