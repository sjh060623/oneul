import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from "react-native";
import { useGoals } from "./src/goalsStore";

const { width } = Dimensions.get("window");

const AnimatedPressable = ({ children, onPress, style, disabled }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, disabled && { opacity: 0.4 }]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={disabled}
        style={[style, { alignItems: "center", justifyContent: "center" }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function AddGoalModal() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const PICK_KEY = "PICKED_PLACE_V1";
  const { addGoal } = useGoals();
  const [place, setPlace] = useState("");
  const [title, setTitle] = useState("");
  const [pickedCoord, setPickedCoord] = useState(null);
  const isFocused = useIsFocused();

  const [containerWidth, setContainerWidth] = useState(0);
  const padding = 4;
  const pillWidth = (containerWidth - padding * 2) / 2;

  const [mode, setMode] = useState("do");
  const slideX = useRef(new Animated.Value(0)).current;

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const placeholderY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isFocused) return;
    const pullPicked = async () => {
      try {
        const v = await AsyncStorage.getItem(PICK_KEY);
        if (v) {
          const c = JSON.parse(v);
          setPickedCoord({
            latitude: Number(c.latitude),
            longitude: Number(c.longitude),
          });
          await AsyncStorage.removeItem(PICK_KEY);
        }
      } catch {}
    };
    pullPicked();
  }, [isFocused]);

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: mode === "do" ? 0 : 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [mode]);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(16);
    const subscription = DeviceMotion.addListener(({ rotation }) => {
      if (rotation) {
        const { gamma, beta } = rotation;
        Animated.spring(tiltX, {
          toValue: gamma * 40,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.spring(tiltY, {
          toValue: (beta - 1) * 40,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    });

    const tick = () => {
      Animated.timing(placeholderY, {
        toValue: -10,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setPlaceholderIndex((prev) => (prev + 1) % 5);
          placeholderY.setValue(10);
          Animated.timing(placeholderY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      });
    };
    const id = setInterval(tick, 2500);

    return () => {
      subscription.remove();
      clearInterval(id);
    };
  }, []);

  const onAdd = () => {
    const p = place.trim();
    const t = title.trim();
    if (mode === "do") {
      if (!t) return Alert.alert("입력 확인", "할 일을 입력해 주세요.");
      addGoal({
        id: String(Date.now()),
        type: mode,
        place: p,
        title: t,
        coord: pickedCoord,
        text: p ? `${p}에서 ${t}하기` : `${t} 하기`,
        createdAt: Date.now(),
      });
    } else {
      if (!p) return Alert.alert("입력 확인", "갈 곳을 입력해 주세요.");
      addGoal({
        id: String(Date.now()),
        type: mode,
        place: p,
        title: "",
        coord: pickedCoord,
        text: `${p} 가기`,
        createdAt: Date.now(),
      });
    }
    Keyboard.dismiss();
    router.back();
  };

  const todoPlaceholders = ["복습", "운동", "독서", "코딩", "산책"];
  const placePlaceholders = ["집", "카페", "헬스장", "회사", "공원"];

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />

      <View style={styles.glowContainer} pointerEvents="none">
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: theme.glowColor,
              transform: [{ translateX: tiltX }, { translateY: tiltY }],
            },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            style={[
              styles.glassWrapper,
              isDark ? styles.darkBorder : styles.lightBorder,
            ]}
          >
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? "dark" : "light"}
              style={styles.sheet}
            >
              <View
                style={[
                  styles.dragHandle,
                  { backgroundColor: theme.progressTrack },
                ]}
              />

              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  새로운 목표
                </Text>
                <Pressable
                  onPress={() => router.back()}
                  style={[
                    styles.closeBtn,
                    { backgroundColor: theme.progressTrack },
                  ]}
                >
                  <Text style={[styles.closeBtnText, { color: theme.subText }]}>
                    닫기
                  </Text>
                </Pressable>
              </View>

              {/* 탭 영역 */}
              <View
                style={[
                  styles.tabContainer,
                  { backgroundColor: theme.progressTrack },
                ]}
                onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
              >
                {containerWidth > 0 && (
                  <Animated.View
                    style={[
                      styles.tabPill,
                      {
                        width: pillWidth,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.15)"
                          : "#FFF",
                        transform: [
                          {
                            translateX: slideX.interpolate({
                              inputRange: [0, 1],
                              outputRange: [padding, padding + pillWidth],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
                <Pressable onPress={() => setMode("do")} style={styles.tabBtn}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: mode === "do" ? theme.text : theme.subText },
                    ]}
                  >
                    ~하기
                  </Text>
                </Pressable>
                <Pressable onPress={() => setMode("go")} style={styles.tabBtn}>
                  <Text
                    style={[
                      styles.tabText,
                      { color: mode === "go" ? theme.text : theme.subText },
                    ]}
                  >
                    ~가기
                  </Text>
                </Pressable>
              </View>

              {/* 입력 섹션 (보정된 부분) */}
              <View style={styles.inputSection}>
                <View
                  style={[
                    styles.sentenceCard,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.inputRow}>
                    <View style={styles.flexInput}>
                      {((mode === "do" && !title) ||
                        (mode === "go" && !place)) && (
                        <Animated.Text
                          style={[
                            styles.fakePlaceholder,
                            {
                              color: theme.subText,
                              transform: [{ translateY: placeholderY }],
                            },
                          ]}
                        >
                          {mode === "do"
                            ? todoPlaceholders[placeholderIndex]
                            : placePlaceholders[placeholderIndex]}
                        </Animated.Text>
                      )}
                      <TextInput
                        value={mode === "do" ? title : place}
                        onChangeText={mode === "do" ? setTitle : setPlace}
                        autoFocus
                        style={[styles.mainInput, { color: theme.text }]}
                        returnKeyType="done"
                      />
                    </View>

                    {/* 버튼과 조사가 일렬로 배치되도록 구성 */}
                    <View style={styles.actionArea}>
                      {mode === "go" && (
                        <AnimatedPressable
                          onPress={() => router.push("/map-picker")}
                          style={[
                            styles.mapBadge,
                            {
                              backgroundColor: theme.badgeBg,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.mapBadgeText,
                              { color: theme.primary },
                            ]}
                          >
                            📍 위치
                          </Text>
                        </AnimatedPressable>
                      )}
                      <Text
                        style={[styles.suffixPrimary, { color: theme.primary }]}
                      >
                        {mode === "do" ? "하기" : "가기"}
                      </Text>
                    </View>
                  </View>
                </View>

                {pickedCoord && (
                  <View
                    style={[
                      styles.coordChip,
                      {
                        backgroundColor: theme.badgeBg,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.coordText, { color: theme.primary }]}>
                      📍 위치가 지정되었습니다
                    </Text>
                    <Pressable onPress={() => setPickedCoord(null)}>
                      <Text style={styles.coordDelete}>지우기</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              <AnimatedPressable
                onPress={onAdd}
                style={[
                  styles.submitBtn,
                  { backgroundColor: isDark ? "#FFF" : theme.primary },
                ]}
              >
                <Text
                  style={[
                    styles.submitBtnText,
                    { color: isDark ? "#000" : "#FFF" },
                  ]}
                >
                  목표 추가하기
                </Text>
              </AnimatedPressable>
            </BlurView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const lightTheme = {
  background: "#F0F2F9",
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  badgeBg: "#EEF2FF",
  inputBg: "rgba(255,255,255,0.6)",
  border: "rgba(255,255,255,0.8)",
  glowColor: "rgba(129, 140, 248, 0.25)",
  progressTrack: "rgba(0,0,0,0.05)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  badgeBg: "rgba(167, 139, 250, 0.1)",
  inputBg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.1)",
  glowColor: "rgba(167, 139, 250, 0.3)",
  progressTrack: "rgba(255,255,255,0.1)",
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  glowCircle: {
    position: "absolute",
    bottom: "10%",
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  keyboardView: { width: "100%" },

  glassWrapper: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
  },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: { fontSize: 20, fontWeight: "800" },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  closeBtnText: { fontSize: 13, fontWeight: "700" },

  tabContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 20,
    marginBottom: 32,
    height: 48,
  },
  tabPill: { position: "absolute", height: 40, borderRadius: 16, top: 4 },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: { fontSize: 14, fontWeight: "800" },

  inputSection: { marginBottom: 32 },
  sentenceCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flexInput: { flex: 1, height: 45, justifyContent: "center" },
  mainInput: { fontSize: 24, fontWeight: "800", padding: 0 },
  fakePlaceholder: { position: "absolute", fontSize: 24, fontWeight: "800" },

  actionArea: { flexDirection: "row", alignItems: "center" },
  suffixPrimary: { fontSize: 24, fontWeight: "800", marginLeft: 8 },
  mapBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  mapBadgeText: { fontSize: 12, fontWeight: "800" },

  coordChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
  },
  coordText: { fontSize: 13, fontWeight: "700" },
  coordDelete: { color: "#FF6B6B", fontSize: 13, fontWeight: "800" },

  submitBtn: {
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: { fontSize: 17, fontWeight: "900" },
});
