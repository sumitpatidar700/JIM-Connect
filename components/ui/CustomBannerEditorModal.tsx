import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  PanResponder,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, typography } from "@/src/theme/tokens";

const { width } = Dimensions.get("window");
const PREVIEW_H = width * 1.25;

export type AspectRatioMode = "uncropped" | "free" | "16:9" | "4:3" | "1:1" | "3:4";

interface CustomBannerEditorModalProps {
  visible: boolean;
  rawUri: string;
  onCancel: () => void;
  onSave: (editedUri: string) => void;
}

export function CustomBannerEditorModal({
  visible,
  rawUri,
  onCancel,
  onSave,
}: CustomBannerEditorModalProps) {
  const insets = useSafeAreaInsets();
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>("uncropped");
  const [rotation, setRotation] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [panState, setPanState] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const initialDistRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const getDistance = (touches: any[]) => {
    if (!touches || touches.length < 2) return 0;
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          initialDistRef.current = getDistance(touches);
          initialScaleRef.current = scale;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (initialDistRef.current && initialDistRef.current > 0) {
            const currentDist = getDistance(touches);
            const multiplier = currentDist / initialDistRef.current;
            const newScale = Math.max(1, Math.min(4.0, initialScaleRef.current * multiplier));
            setScale(newScale);
          }
        } else if (touches.length === 1) {
          setPanState({
            x: panRef.current.x + gestureState.dx,
            y: panRef.current.y + gestureState.dy,
          });
        }
      },
      onPanResponderRelease: () => {
        panRef.current = { x: panState.x, y: panState.y };
        initialDistRef.current = null;
        initialScaleRef.current = scale;
      },
      onPanResponderTerminate: () => {
        panRef.current = { x: panState.x, y: panState.y };
        initialDistRef.current = null;
        initialScaleRef.current = scale;
      },
    })
  ).current;

  useEffect(() => {
    if (visible && rawUri) {
      setRotation(0);
      setScale(1);
      panRef.current = { x: 0, y: 0 };
      setPanState({ x: 0, y: 0 });
      initialDistRef.current = null;
      initialScaleRef.current = 1;
      Image.getSize(
        rawUri,
        (w, h) => {
          setImageDimensions({ width: w, height: h });
        },
        () => {
          setImageDimensions({ width: 1200, height: 900 });
        }
      );
    }
  }, [visible, rawUri]);

  // Calculate mask dimensions
  const MAX_W = width * 0.88;
  let maskW = MAX_W;
  let maskH = MAX_W * (9 / 16);

  if (aspectMode === "16:9") {
    maskW = MAX_W;
    maskH = MAX_W * (9 / 16);
  } else if (aspectMode === "4:3") {
    maskW = MAX_W;
    maskH = MAX_W * (3 / 4);
  } else if (aspectMode === "1:1") {
    maskW = MAX_W;
    maskH = MAX_W;
  } else if (aspectMode === "3:4") {
    maskH = PREVIEW_H * 0.85;
    maskW = maskH * (3 / 4);
  } else if (aspectMode === "free") {
    const origW = imageDimensions?.width ?? 1200;
    const origH = imageDimensions?.height ?? 900;
    const origRatio = origW / origH;
    if (origRatio >= 1) {
      maskW = MAX_W;
      maskH = MAX_W / origRatio;
    } else {
      maskH = PREVIEW_H * 0.85;
      maskW = maskH * origRatio;
    }
  }

  const maskCenterX = width / 2;
  const maskCenterY = PREVIEW_H / 2;
  const maskLeft = maskCenterX - maskW / 2;
  const maskTop = maskCenterY - maskH / 2;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setRotation(0);
    setScale(1);
    panRef.current = { x: 0, y: 0 };
    setPanState({ x: 0, y: 0 });
    initialDistRef.current = null;
    initialScaleRef.current = 1;
  };

  const handleDone = async () => {
    if (!rawUri || isProcessing) return;
    setIsProcessing(true);

    try {
      const actions: ImageManipulator.Action[] = [];

      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      let currentWidth = imageDimensions?.width ?? 1200;
      let currentHeight = imageDimensions?.height ?? 900;

      if (rotation === 90 || rotation === 270) {
        const temp = currentWidth;
        currentWidth = currentHeight;
        currentHeight = temp;
      }

      if (aspectMode !== "uncropped") {
        const ratio = Math.min(width / currentWidth, PREVIEW_H / currentHeight);
        const W_disp = currentWidth * ratio;
        const H_disp = currentHeight * ratio;

        const imgLeft = maskCenterX - (W_disp * scale) / 2 + panState.x;
        const imgTop = maskCenterY - (H_disp * scale) / 2 + panState.y;

        const cropX_disp = maskLeft - imgLeft;
        const cropY_disp = maskTop - imgTop;

        const effectiveRatio = ratio * scale;

        let cropX = Math.floor(cropX_disp / effectiveRatio);
        let cropY = Math.floor(cropY_disp / effectiveRatio);
        let cropW = Math.floor(maskW / effectiveRatio);
        let cropH = Math.floor(maskH / effectiveRatio);

        cropX = Math.max(0, Math.min(cropX, currentWidth - 10));
        cropY = Math.max(0, Math.min(cropY, currentHeight - 10));
        cropW = Math.min(cropW, currentWidth - cropX);
        cropH = Math.min(cropH, currentHeight - cropY);

        actions.push({
          crop: {
            originX: cropX,
            originY: cropY,
            width: Math.max(10, cropW),
            height: Math.max(10, cropH),
          },
        });

        // Resize proportionally so max dimension is 1280px for excellent resolution
        const maxDim = Math.max(cropW, cropH);
        if (maxDim > 1280) {
          const resizeRatio = 1280 / maxDim;
          actions.push({
            resize: {
              width: Math.round(cropW * resizeRatio),
              height: Math.round(cropH * resizeRatio),
            },
          });
        }
      } else {
        const maxDim = Math.max(currentWidth, currentHeight);
        if (maxDim > 1280) {
          const resizeRatio = 1280 / maxDim;
          actions.push({
            resize: {
              width: Math.round(currentWidth * resizeRatio),
              height: Math.round(currentHeight * resizeRatio),
            },
          });
        }
      }

      const result = await ImageManipulator.manipulateAsync(rawUri, actions, {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      onSave(result.uri);
    } catch (error) {
      onSave(rawUri);
    } finally {
      setIsProcessing(false);
    }
  };

  const aspectOptions: { label: string; mode: AspectRatioMode; icon: any }[] = [
    { label: "None (No Crop)", mode: "uncropped", icon: "checkmark-circle-outline" },
    { label: "16:9 Banner", mode: "16:9", icon: "tv-outline" },
    { label: "4:3 Standard", mode: "4:3", icon: "albums-outline" },
    { label: "1:1 Square", mode: "1:1", icon: "stop-outline" },
    { label: "3:4 Poster", mode: "3:4", icon: "phone-portrait-outline" },
    { label: "Original Ratio", mode: "free", icon: "scan-outline" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackground}>
        {/* Top Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Pressable onPress={onCancel} style={styles.cancelBtnCircle}>
            <Ionicons name="close" size={22} color="#64748B" />
          </Pressable>

          <Text style={styles.headerTitle}>Customize Event Banner</Text>

          <Pressable
            disabled={isProcessing}
            onPress={() => void handleDone()}
            style={[styles.saveBtnCircle, isProcessing && styles.saveBtnDisabled]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        {/* Image Preview & Interactive Touch Surface */}
        <View style={[styles.previewContainer, { height: PREVIEW_H }]} {...panResponder.panHandlers}>
          <View style={[styles.imageWrapper, { height: PREVIEW_H }]}>
            <Image
              source={{ uri: rawUri }}
              style={[
                styles.previewImage,
                {
                  transform: [
                    { translateX: panState.x },
                    { translateY: panState.y },
                    { scale: scale },
                    { rotate: `${rotation}deg` },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Semi-transparent backdrop and dashed mask rectangle */}
          {aspectMode !== "uncropped" ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
              <View
                style={{
                  position: "absolute",
                  top: maskTop,
                  left: maskLeft,
                  width: maskW,
                  height: maskH,
                  borderColor: "#FFFFFF",
                  borderWidth: 2.5,
                  borderStyle: "dashed",
                  backgroundColor: "transparent",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.5,
                  shadowRadius: 6,
                }}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.hintBadge}>
            <Text style={styles.hintText}>
              {aspectMode === "uncropped" ? "Original full uncropped image" : "Pinch to zoom & drag to align inside the box"}
            </Text>
          </View>
        </View>

        {/* Bottom Bar: Aspect Ratios and Tools */}
        <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={styles.sectionHeading}>Choose Size / Aspect Ratio</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.aspectScroll}
            style={{ flexGrow: 0, marginBottom: 16 }}
          >
            {aspectOptions.map((item) => {
              const active = aspectMode === item.mode;
              return (
                <Pressable
                  key={item.mode}
                  onPress={() => {
                    setAspectMode(item.mode);
                    handleReset();
                  }}
                  style={[styles.aspectPill, active && styles.aspectPillActive]}
                >
                  <Ionicons name={item.icon} size={18} color={active ? "#FFFFFF" : "#475569"} />
                  <Text style={[styles.aspectPillText, active && styles.aspectPillTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.toolbar}>
            <Pressable onPress={() => setScale((s) => Math.min(s + 0.25, 4.0))} style={styles.toolBtn}>
              <View style={styles.iconCircle}>
                <Ionicons name="add" size={22} color="#2563EB" />
              </View>
              <Text style={styles.toolLabel}>Zoom In</Text>
            </Pressable>

            <Pressable onPress={() => setScale((s) => Math.max(s - 0.25, 1))} style={styles.toolBtn}>
              <View style={styles.iconCircle}>
                <Ionicons name="remove" size={22} color="#EC4899" />
              </View>
              <Text style={styles.toolLabel}>Zoom Out</Text>
            </Pressable>

            <Pressable onPress={handleRotate} style={styles.toolBtn}>
              <View style={styles.iconCircle}>
                <Ionicons name="refresh" size={22} color="#10B981" />
              </View>
              <Text style={styles.toolLabel}>Rotate</Text>
            </Pressable>

            <Pressable onPress={handleReset} style={styles.toolBtn}>
              <View style={styles.iconCircle}>
                <Ionicons name="reload" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.toolLabel}>Reset</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  cancelBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontFamily: typography.bold,
  },
  saveBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#34D399",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  previewContainer: {
    width: width,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#0F172A",
  },
  imageWrapper: {
    width: width,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  hintBadge: {
    position: "absolute",
    top: 20,
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#475569",
  },
  hintText: {
    color: "#F8FAFC",
    fontSize: 13,
    fontFamily: typography.semiBold,
    textAlign: "center",
  },
  bottomSheet: {
    paddingTop: 20,
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    elevation: 20,
  },
  sectionHeading: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: typography.semiBold,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  aspectScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  aspectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#334155",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#475569",
  },
  aspectPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#3B82F6",
  },
  aspectPillText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontFamily: typography.semiBold,
  },
  aspectPillTextActive: {
    color: "#FFFFFF",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: 10,
  },
  toolBtn: {
    alignItems: "center",
    gap: 6,
    minWidth: 70,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#475569",
  },
  toolLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: typography.medium,
  },
});
