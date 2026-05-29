import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useEffect, useState } from "react";
import { useThemeColors } from "@/src/utils/settings-effects";
import { useAuthStore } from "@/src/store/auth-store";
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
  const themeColors = useThemeColors();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [batchId, setBatchId] = useState("");
  const [avatarImageUri, setAvatarImageUri] = useState("");
  const [rawImageUri, setRawImageUri] = useState("");
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const batches = useAuthStore((state) => state.batches);
  const fetchBatches = useAuthStore((state) => state.fetchBatches);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    let intervalId: any;
    if (timer > 0) {
      intervalId = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timer]);

  const handleSendOtp = async () => {
    setErrorMsg("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg("Please enter your college email address.");
      await showAlert({
        message: "Please enter your college email address.",
        title: "Email required",
        tone: "warning",
      });
      return;
    }

    const isAllowed = trimmedEmail.toLowerCase().endsWith("@jaipuria.ac.in") || 
                      trimmedEmail.toLowerCase() === "sumitpatidar700@gmail.com" || 
                      trimmedEmail.toLowerCase() === "sumitpatidar16903@gmail.com" ||
                      trimmedEmail.toLowerCase() === "sumitpatidar1602@gmail.com";
    if (!isAllowed) {
      setErrorMsg("Registration is restricted to @jaipuria.ac.in email addresses.");
      await showAlert({
        message: "Registration is restricted to @jaipuria.ac.in email addresses.",
        title: "Invalid Domain",
        tone: "warning",
      });
      return;
    }

    if (!name.trim()) {
      setErrorMsg("Please enter your full name first.");
      await showAlert({
        message: "Please enter your full name first.",
        title: "Name required",
        tone: "warning",
      });
      return;
    }

    if (phone.replace(/\D/g, "").length !== 10) {
      setErrorMsg("Please enter a valid 10-digit phone number first.");
      await showAlert({
        message: "Please enter a valid 10-digit phone number first.",
        title: "Phone number required",
        tone: "warning",
      });
      return;
    }

    if (!batchId) {
      setErrorMsg("Please select your academic batch first.");
      await showAlert({
        message: "Please select your academic batch first.",
        title: "Batch required",
        tone: "warning",
      });
      return;
    }

    if (!password) {
      setErrorMsg("Please create a secure password first.");
      await showAlert({
        message: "Please create a secure password first.",
        title: "Password required",
        tone: "warning",
      });
      return;
    }

    if (!avatarImageUri) {
      setErrorMsg("Please add a profile photo before verifying your email.");
      await showAlert({
        message: "Please add a profile photo before verifying your email.",
        title: "Profile photo required",
        tone: "warning",
      });
      return;
    }

    try {
      setSendingOtp(true);

      const isRegistered = await authService.checkEmailRegistered(trimmedEmail);
      if (isRegistered) {
        setErrorMsg("This email address is already registered. Please sign in.");
        await showAlert({
          message: "This email address is already registered. Please sign in.",
          title: "Account exists",
          tone: "warning",
        });
        return;
      }

      const res = await authService.signUp({
        email: trimmedEmail,
        password,
        name: name.trim(),
        phone: phone || undefined,
        avatarImageUri: avatarImageUri,
        batchId: batchId || undefined,
      });

      if (res.session) {
        setIsVerified(true);
        const profile = res.user
          ? await authService.getProfile(res.user.id)
          : null;
        useAuthStore.getState().setAuthState({ profile, session: res.session });

        await showAlert({
          message: "Account created and logged in successfully!",
          title: "Account Created",
          tone: "success",
        });
        
        router.replace(
          profile?.role === "admin"
            ? "/(app)/(tabs)/admin-dashboard"
            : "/(app)/(tabs)",
        );
      } else {
        setIsOtpSent(true);
        setTempUserId(res.user?.id || null);
        setTimer(60);
        await showAlert({
          message: "A 6-digit verification code has been sent to your email. Please check your inbox and enter it below.",
          title: "Verification code sent",
          tone: "default",
        });
      }
    } catch (error: any) {
      const msg = error?.message || error?.details || "Please try again.";
      setErrorMsg(msg);
      await showAlert({
        message: msg,
        title: "Unable to send verification",
        tone: "error",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMsg("");
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter the 6-digit verification code.");
      await showAlert({
        message: "Please enter the 6-digit verification code.",
        title: "Invalid code",
        tone: "warning",
      });
      return;
    }

    try {
      setVerifyingOtp(true);
      
      const response = await authService.verifySignUpOtp({
        email: email.trim(),
        token: otpCode,
        userId: tempUserId || "",
        avatarImageUri,
        phone: phone || undefined,
        batchId: batchId || undefined,
        name: name,
      });

      setIsVerified(true);
      setIsOtpSent(false);
      
      const profile = response.user
        ? await authService.getProfile(response.user.id)
        : null;
        
      if (response.session) {
        useAuthStore.getState().setAuthState({ profile, session: response.session });
      }

      await showAlert({
        message: "Your email has been verified and your account is successfully created!",
        title: "Account Created",
        tone: "success",
      });

      router.replace(
        profile?.role === "admin"
          ? "/(app)/(tabs)/admin-dashboard"
          : "/(app)/(tabs)",
      );
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      setErrorMsg(msg);
      await showAlert({
        message: msg,
        title: "Verification failed",
        tone: "error",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleCancelVerification = () => {
    setIsOtpSent(false);
    setTimer(0);
    setOtpCode("");
    setErrorMsg("");
  };

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
    if (!isVerified) {
      await showAlert({
        message: "Please verify your email address first using the OTP code sent to your inbox.",
        title: "Verification required",
        tone: "warning",
      });
      return;
    }
    router.replace("/(auth)/login");
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
              <Text style={styles.title}>Create your JIM Connect account</Text>
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
                onChangeText={(val) => {
                  setName(val);
                  setErrorMsg("");
                }}
                editable={!isOtpSent && !isVerified}
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
                onChangeText={(val) => {
                  setEmail(val);
                  setErrorMsg("");
                }}
                editable={!isOtpSent && !isVerified && !sendingOtp}
              />
              <TextField
                autoComplete="tel"
                keyboardType="phone-pad"
                label="Phone number"
                placeholder="Your mobile number"
                textContentType="telephoneNumber"
                value={phone}
                onChangeText={(value) => {
                  setPhone(value.replace(/\D/g, "").slice(0, 10));
                  setErrorMsg("");
                }}
                editable={!isOtpSent && !isVerified}
              />
              
              <View style={{ gap: spacing.xs, marginVertical: spacing.xs / 2 }}>
                <Text style={{ fontSize: 14, fontFamily: typography.medium, color: colors.text }}>
                  Academic Batch <Text style={{ color: "#EF4444" }}>*</Text>
                </Text>
                {batches.length === 0 ? (
                  <Text style={{ fontSize: 13, fontFamily: typography.regular, color: colors.muted, fontStyle: "italic" }}>
                    Loading batches...
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 }}>
                    {batches.map((batch) => {
                      const isSelected = batchId === batch.id;
                      return (
                        <Pressable
                          key={batch.id}
                          disabled={isOtpSent || isVerified}
                          onPress={() => {
                            setBatchId(batch.id);
                            setErrorMsg("");
                          }}
                          style={{
                            paddingHorizontal: spacing.md,
                            paddingVertical: 8,
                            borderRadius: radii.round,
                            borderWidth: 1.5,
                            borderColor: isSelected ? themeColors.primary : colors.border,
                            backgroundColor: isSelected ? `${themeColors.primary}15` : colors.surface,
                          }}
                        >
                          <Text style={{
                            fontSize: 13,
                            fontFamily: isSelected ? typography.semiBold : typography.medium,
                            color: isSelected ? themeColors.primary : colors.text,
                          }}>
                            {batch.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <TextField
                label="Password"
                placeholder="Create a secure password"
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  setErrorMsg("");
                }}
                editable={!isOtpSent && !isVerified}
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
              {isOtpSent && !isVerified ? (
                <View style={{ gap: spacing.xs, marginVertical: spacing.xs }}>
                  <TextField
                    keyboardType="number-pad"
                    label="Verification Code (OTP)"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChangeText={(value) => {
                      setOtpCode(value.replace(/\D/g, "").slice(0, 6));
                      setErrorMsg("");
                    }}
                    editable={!verifyingOtp}
                  />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 }}>
                    <Pressable onPress={handleCancelVerification} disabled={verifyingOtp}>
                      <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                        Change email or details
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      onPress={handleSendOtp}
                      disabled={timer > 0 || sendingOtp}
                      style={({ pressed }) => [
                        { opacity: (timer > 0 || sendingOtp) ? 0.5 : pressed ? 0.7 : 1 }
                      ]}
                    >
                      <Text style={{ fontSize: 13, fontFamily: typography.semiBold, color: themeColors.primary }}>
                        {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
              {errorMsg ? (
                <View style={{ backgroundColor: "#FEF2F2", borderColor: "#F87171", borderWidth: 1, padding: 12, borderRadius: radii.md, marginVertical: spacing.xs }}>
                  <Text style={{ color: "#991B1B", fontFamily: typography.medium, fontSize: 13, textAlign: "center", lineHeight: 18 }}>
                    {errorMsg}
                  </Text>
                </View>
              ) : null}
              {!isOtpSent ? (
                <PrimaryButton
                  disabled={
                    !name ||
                    !email ||
                    phone.replace(/\D/g, "").length !== 10 ||
                    !batchId ||
                    !password ||
                    !avatarImageUri ||
                    sendingOtp
                  }
                  label={sendingOtp ? "Sending Verification..." : "Send Verification Code"}
                  onPress={handleSendOtp}
                />
              ) : (
                <PrimaryButton
                  disabled={
                    otpCode.length !== 6 ||
                    verifyingOtp
                  }
                  label={verifyingOtp ? "Verifying..." : "Verify & Create Account"}
                  onPress={handleVerifyOtp}
                />
              )}
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
  emailRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  otpRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  verifyBtn: {
    borderRadius: radii.lg,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    minWidth: 106,
  },
  verifyBtnDisabled: {
    opacity: 0.5,
  },
  verifyBtnText: {
    fontFamily: typography.semiBold,
    fontSize: getResponsiveFontSize(13, 12, 14),
  },
});
