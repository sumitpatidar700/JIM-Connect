import { PropsWithChildren, ReactNode, Ref } from "react";
import { Image } from "expo-image";
import {
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ScrollViewProps,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/src/theme/tokens";
import { useAppSettingsStore } from "@/src/store/settings-store";
import { compactValue, useThemeColors } from "@/src/utils/settings-effects";

type Props = PropsWithChildren<{
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactNode;
  scrollRef?: Ref<ScrollView>;
  scrollable?: boolean;
  extraPaddingBottom?: number;
  dismissKeyboardOnTap?: boolean;
}> &
  ScrollViewProps;

export function Screen({
  children,
  contentContainerStyle,
  refreshControl,
  scrollRef,
  scrollable = false,
  extraPaddingBottom,
  dismissKeyboardOnTap = true,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  const themeColors = useThemeColors();
  const compactLayout = useAppSettingsStore((state) => state.compactLayout);
  const logoPreviewEnabled = useAppSettingsStore((state) => state.logoPreviewEnabled);
  const contentPadding = compactValue(spacing.lg, compactLayout);
  const topPadding = compactValue(spacing.xl, compactLayout);
  const itemGap = compactValue(spacing.lg, compactLayout);
  const bottomGap = extraPaddingBottom ?? 120; // extra space so content isn't hidden behind bottom panels

  if (scrollable) {
    return (
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.safeArea, { backgroundColor: themeColors.background }]}
      >
        {logoPreviewEnabled ? (
          <View pointerEvents="none" style={styles.logoWatermarkWrap}>
            <Image
              contentFit="contain"
              source={require("@/assets/images/clg_logo.png")}
              style={styles.logoWatermark}
            />
          </View>
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.content,
              styles.scrollContent,
              {
                padding: contentPadding,
                paddingBottom: contentPadding + insets.bottom + bottomGap,
                paddingTop: topPadding,
              },
              contentContainerStyle,
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ref={scrollRef}
            refreshControl={refreshControl as never}
            showsVerticalScrollIndicator={false}
            {...rest}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false} disabled={!dismissKeyboardOnTap}>
              <View style={{ flex: 1, gap: itemGap }}>
                {children}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
    >
      {logoPreviewEnabled ? (
        <View pointerEvents="none" style={styles.logoWatermarkWrap}>
          <Image
            contentFit="contain"
            source={require("@/assets/images/clg_logo.png")}
            style={styles.logoWatermark}
          />
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.flex}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false} disabled={!dismissKeyboardOnTap}>
          <View
            style={[
              styles.content,
              styles.flex,
              { 
                padding: contentPadding, 
                paddingBottom: extraPaddingBottom === 0 ? 0 : contentPadding + insets.bottom + bottomGap 
              },
              contentContainerStyle,
            ]}
          >
            {children}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  logoWatermark: {
    height: 260,
    opacity: 0.18,
    width: 260,
  },
  logoWatermarkWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 0,
  },
});
