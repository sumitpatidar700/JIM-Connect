import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function SplashScreenView() {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom + 20, 36);

  return (
    <View style={styles.container}>
      {/* Centered Logo - Small size (120x120), no background card, no shadow */}
      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/jim-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 250,
    height: 250,
  },
});
