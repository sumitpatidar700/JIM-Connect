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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radii, typography } from "@/src/theme/tokens";

const { width } = Dimensions.get("window");
const MASK_SIZE = width * 0.8; // 80% of screen width for the circular cutout

interface CustomPhotoEditorModalProps {
  visible: boolean;
  rawUri: string;
  onCancel: () => void;
  onSave: (editedUri: string) => void;
}

export function CustomPhotoEditorModal({
  visible,
  rawUri,
  onCancel,
  onSave,
}: CustomPhotoEditorModalProps) {
  const insets = useSafeAreaInsets();
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
          // 2-finger pinch zoom
          if (initialDistRef.current && initialDistRef.current > 0) {
            const currentDist = getDistance(touches);
            const multiplier = currentDist / initialDistRef.current;
            const newScale = Math.max(1, Math.min(3.5, initialScaleRef.current * multiplier));
            setScale(newScale);
          }
        } else if (touches.length === 1) {
          // 1-finger drag
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
          setImageDimensions({ width: 1000, height: 1000 });
        }
      );
    }
  }, [visible, rawUri]);

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

      // 1. Rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // 2. Compute precise visible crop area under the white circle
      let currentWidth = imageDimensions?.width ?? 1000;
      let currentHeight = imageDimensions?.height ?? 1000;

      if (rotation === 90 || rotation === 270) {
        const temp = currentWidth;
        currentWidth = currentHeight;
        currentHeight = temp;
      }

      const ratio = Math.min(width / currentWidth, width / currentHeight);
      const W_disp = currentWidth * ratio;
      const H_disp = currentHeight * ratio;

      const maskLeft = width / 2 - MASK_SIZE / 2;
      const maskTop = width / 2 - MASK_SIZE / 2;

      const imgLeft = width / 2 - (W_disp * scale) / 2 + panState.x;
      const imgTop = width / 2 - (H_disp * scale) / 2 + panState.y;

      const cropX_disp = maskLeft - imgLeft;
      const cropY_disp = maskTop - imgTop;

      const effectiveRatio = ratio * scale;

      let cropX = Math.floor(cropX_disp / effectiveRatio);
      let cropY = Math.floor(cropY_disp / effectiveRatio);
      let cropW = Math.floor(MASK_SIZE / effectiveRatio);
      let cropH = Math.floor(MASK_SIZE / effectiveRatio);

      // Clamp to valid pixel boundaries
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

      // 3. Resize to a pristine 600x600 avatar format
      actions.push({
        resize: { width: 600, height: 600 },
      });

      const result = await ImageManipulator.manipulateAsync(rawUri, actions, {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      onSave(result.uri);
    } catch (error) {
      // Fallback safely to raw URI
      onSave(rawUri);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalBackground}>
        {/* Top Header - Light UI */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Pressable onPress={onCancel} style={styles.cancelBtnCircle}>
            <Ionicons name="close" size={22} color="#64748B" />
          </Pressable>

          <Text style={styles.headerTitle}>Edit Profile Photo</Text>

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

        {/* Image Preview Area & Interactive Touch Surface */}
        <View style={styles.previewContainer} {...panResponder.panHandlers}>
          <View style={styles.imageWrapper}>
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

          {/* Elegant White Dashed Circle Overlay */}
          <View pointerEvents="none" style={styles.maskContainer}>
            <View style={styles.dottedCircle} />
          </View>

          <View pointerEvents="none" style={styles.hintBadge}>
            <Text style={styles.hintText}>
              Pinch to zoom & drag to center your face
            </Text>
          </View>
        </View>

        {/* Bottom Toolbar Controls - Floating rounded sheet */}
        <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable onPress={() => setScale((s) => Math.min(s + 0.25, 3.5))} style={styles.toolBtn}>
            <View style={styles.iconCircle}>
              <Ionicons name="add-circle-outline" size={26} color="#2563EB" />
            </View>
            <Text style={styles.toolLabel}>Zoom In</Text>
          </Pressable>

          <Pressable onPress={() => setScale((s) => Math.max(s - 0.25, 1))} style={styles.toolBtn}>
            <View style={styles.iconCircle}>
              <Ionicons name="remove-circle-outline" size={26} color="#EC4899" />
            </View>
            <Text style={styles.toolLabel}>Zoom Out</Text>
          </Pressable>

          <Pressable onPress={handleRotate} style={styles.toolBtn}>
            <View style={styles.iconCircle}>
              <Ionicons name="refresh" size={24} color="#10B981" />
            </View>
            <Text style={styles.toolLabel}>Rotate 90°</Text>
          </Pressable>

          <Pressable onPress={handleReset} style={styles.toolBtn}>
            <View style={styles.iconCircle}>
              <Ionicons name="reload" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.toolLabel}>Reset</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Clean, bright light UI background
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cancelBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  headerTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontFamily: typography.bold,
  },
  saveBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#10B981", // Beautiful Emerald Green
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#34D399", // Clean light emerald circular border
    elevation: 4,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  previewContainer: {
    flex: 1,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  imageWrapper: {
    width: width,
    height: width,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dottedCircle: {
    width: MASK_SIZE,
    height: MASK_SIZE,
    borderRadius: 9999,
    borderWidth: 2.5,
    borderColor: "#FFFFFF", // Crisp white line circle
    borderStyle: "dashed",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  hintBadge: {
    position: "absolute",
    top: 32,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 24, // Flawless rounded pill container
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  hintText: {
    color: "#0F172A",
    fontSize: 14,
    fontFamily: typography.semiBold,
    textAlign: "center",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: 22,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32, // Rounded upper corners only!
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: "#E2E8F0",
    borderRightColor: "#E2E8F0",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  toolBtn: {
    alignItems: "center",
    gap: 8,
    minWidth: 70,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  toolLabel: {
    color: "#475569",
    fontSize: 13,
    fontFamily: typography.medium,
  },
});
