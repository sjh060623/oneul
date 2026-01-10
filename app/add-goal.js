import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useGoals } from "./src/goalsStore";

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
        style={[
          style,
          { width: "100%", alignItems: "center", justifyContent: "center" },
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function AddGoalModal() {
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
    return () => clearInterval(id);
  }, []);

  const onAdd = () => {
    const p = place.trim();
    const t = title.trim();
    if (mode === "do") {
      if (!t) return Alert.alert("입력 확인", "할 일을 입력해 주세요.");
      const baseTitle = t.endsWith("하기") ? t.slice(0, -2).trim() : t;
      addGoal({
        id: String(Date.now()),
        type: mode,
        place: p,
        title: baseTitle,
        coord: pickedCoord,
        text: p ? `${p}에서 ${baseTitle}하기` : `${baseTitle}하기`,
        createdAt: Date.now(),
      });
    } else {
      if (!p) return Alert.alert("입력 확인", "갈 곳을 입력해 주세요.");
      const basePlace = p.endsWith("가기") ? p.slice(0, -2).trim() : p;
      addGoal({
        id: String(Date.now()),
        type: mode,
        place: basePlace,
        title: "",
        coord: pickedCoord,
        text: `${basePlace} 가기`,
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>새로운 목표</Text>
              <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>닫기</Text>
              </Pressable>
            </View>

            <View
              style={styles.tabContainer}
              onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            >
              {containerWidth > 0 && (
                <Animated.View
                  style={[
                    styles.tabPill,
                    {
                      width: pillWidth,
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
                    mode === "do" && styles.tabTextActive,
                  ]}
                >
                  ~하기
                </Text>
              </Pressable>
              <Pressable onPress={() => setMode("go")} style={styles.tabBtn}>
                <Text
                  style={[
                    styles.tabText,
                    mode === "go" && styles.tabTextActive,
                  ]}
                >
                  ~가기
                </Text>
              </Pressable>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.sentenceCard}>
                <View style={styles.inputRow}>
                  <View style={styles.flexInput}>
                    {((mode === "do" && !title) ||
                      (mode === "go" && !place)) && (
                      <Animated.Text
                        style={[
                          styles.fakePlaceholder,
                          { transform: [{ translateY: placeholderY }] },
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
                      style={styles.mainInput}
                      returnKeyType="done"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                  {mode === "go" && (
                    <AnimatedPressable
                      onPress={() => router.push("/map-picker")}
                      style={styles.mapBadge}
                    >
                      <Text style={styles.mapBadgeText}>📍 위치</Text>
                    </AnimatedPressable>
                  )}
                  <Text style={styles.suffixPrimary}>
                    {mode === "do" ? "하기" : "가기"}
                  </Text>
                </View>
              </View>

              {pickedCoord && (
                <View style={styles.coordChip}>
                  <Text style={styles.coordText}>
                    📍 지정된 위치가 있습니다
                  </Text>
                  <Pressable onPress={() => setPickedCoord(null)}>
                    <Text style={styles.coordDelete}>지우기</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <AnimatedPressable onPress={onAdd} style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>목표 추가하기</Text>
            </AnimatedPressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  keyboardView: { width: "100%" },
  sheet: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#222",
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
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  closeBtn: { padding: 8, backgroundColor: "#161616", borderRadius: 12 },
  closeBtnText: { color: "#6f7377", fontSize: 13, fontWeight: "700" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#161616",
    padding: 4,
    borderRadius: 20,
    marginBottom: 32,
    height: 48,
  },
  tabPill: {
    position: "absolute",
    height: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    top: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: { color: "#6f7377", fontSize: 14, fontWeight: "800" },
  tabTextActive: { color: "#000" },

  inputSection: { marginBottom: 32 },
  sentenceCard: {
    backgroundColor: "#161616",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#262626",
  },
  inputRow: { flexDirection: "row", alignItems: "center" },
  flexInput: { flex: 1, height: 40, justifyContent: "center" },
  mainInput: { color: "#fff", fontSize: 24, fontWeight: "900" },
  fakePlaceholder: {
    position: "absolute",
    color: "#333",
    fontSize: 24,
    fontWeight: "900",
  },
  suffixPrimary: {
    color: "#6366F1",
    fontSize: 24,
    fontWeight: "900",
    marginLeft: 8,
  },
  mapBadge: {
    backgroundColor: "#312E81",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  mapBadgeText: { color: "#6366F1", fontSize: 12, fontWeight: "800" },
  coordChip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#161616",
    padding: 14,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#312E81",
  },
  coordText: { color: "#6366F1", fontSize: 13, fontWeight: "700" },
  coordDelete: { color: "#ff4444", fontSize: 13, fontWeight: "800" },

  submitBtn: {
    backgroundColor: "#fff",
    height: 56,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  submitBtnText: { color: "#000", fontSize: 16, fontWeight: "900" },
});
