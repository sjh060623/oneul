import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { DeviceMotion } from "expo-sensors";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
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
import { useGoals } from "../src/goalsStore";

const { width, height } = Dimensions.get("window");
const DAILY_DONE_KEY = "DAILY_DONE_V1";

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
      style={[{ transform: [{ scale }] }, style, disabled && { opacity: 0.4 }]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        disabled={disabled}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function DailySetupOverlay({ enabled = true }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;
  const { addGoal, reminderTime, clearPreviousDaysGoals } = useGoals();

  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  const inputRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const todayKey = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const setAt = (idx, v) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const checkDue = useCallback(async () => {
    if (!enabled) return;
    try {
      const doneRaw = await AsyncStorage.getItem(DAILY_DONE_KEY);
      const done = doneRaw ? JSON.parse(doneRaw) : null;
      const today = todayKey();

      const [targetH, targetM] = reminderTime.split(":").map(Number);
      const now = new Date();
      const isTimePast =
        now.getHours() > targetH ||
        (now.getHours() === targetH && now.getMinutes() >= targetM);
      const notDoneToday = done?.lastDoneDate !== today;

      if (isTimePast && notDoneToday) {
        if (!visible) {
          if (typeof clearPreviousDaysGoals === "function") {
            clearPreviousDaysGoals();
          }
          setVisible(true);
        }
      } else if (visible && !notDoneToday) {
        setVisible(false);
      }
    } catch (e) {
      console.error("checkDue Error:", e);
    }
  }, [enabled, reminderTime, visible, clearPreviousDaysGoals]);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    checkDue();
    const interval = setInterval(checkDue, 3000);

    const appStateSub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkDue();
    });

    DeviceMotion.setUpdateInterval(16);
    const motionSub = DeviceMotion.addListener(({ rotation }) => {
      if (rotation && visible) {
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

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      motionSub.remove();
    };
  }, [checkDue, visible]);

  // 목표 제출
  const submit = async () => {
    const trimmed = items.filter((s) => s.trim());
    if (saving || trimmed.length < 1) return;
    setSaving(true);
    try {
      for (const text of trimmed) {
        const formattedText = text.endsWith("하기") ? text : `${text} 하기`;
        addGoal({ text: formattedText, type: "todo", coord: null });
      }
      await AsyncStorage.setItem(
        DAILY_DONE_KEY,
        JSON.stringify({ lastDoneDate: todayKey() })
      );
      setVisible(false);
      setItems(["", "", "", "", ""]);
      Keyboard.dismiss();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // 건너뛰기
  const submitPass = async () => {
    Alert.alert("목표 작성 건너뛰기", "오늘의 목표를 적지 않고 넘어갈까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "건너뛰기",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.setItem(
            DAILY_DONE_KEY,
            JSON.stringify({ lastDoneDate: todayKey() })
          );
          setVisible(false);
        },
      },
    ]);
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.fullOverlay, { opacity: fadeAnim }]}>
      <BlurView
        intensity={isDark ? 80 : 90}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      >
        {/* 배경 글로우 효과 */}
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kb}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.contentContainer}>
              <View
                style={[
                  styles.glassWrapper,
                  isDark ? styles.darkBorder : styles.lightBorder,
                ]}
              >
                <View style={styles.sheet}>
                  <View style={styles.header}>
                    <Text style={[styles.h1, { color: theme.text }]}>
                      오늘의 목표
                    </Text>
                    <View
                      style={[
                        styles.timeBadge,
                        { backgroundColor: theme.badgeBg },
                      ]}
                    >
                      <Text style={[styles.timeText, { color: theme.primary }]}>
                        매일 {reminderTime} 리셋
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.sub, { color: theme.subText }]}>
                    성장을 위해 할 일을 적어주세요.
                  </Text>

                  <View style={styles.inputContainer}>
                    {items.map((v, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.inputRow,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <TextInput
                          ref={(el) => (inputRefs.current[idx] = el)}
                          value={v}
                          onChangeText={(t) => setAt(idx, t)}
                          placeholder="무엇을 할까요?"
                          style={[styles.input, { color: theme.text }]}
                          placeholderTextColor={theme.subText}
                          returnKeyType={idx === 4 ? "done" : "next"}
                          onSubmitEditing={() => {
                            if (idx < 4) inputRefs.current[idx + 1].focus();
                            else submit();
                          }}
                        />
                      </View>
                    ))}
                  </View>

                  <AnimatedPressable
                    onPress={submit}
                    disabled={
                      items.filter((s) => s.trim()).length < 1 || saving
                    }
                    style={styles.submitMargin}
                  >
                    <View
                      style={[
                        styles.primaryBtn,
                        { backgroundColor: isDark ? "#FFF" : theme.primary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.primaryText,
                          { color: isDark ? "#000" : "#FFF" },
                        ]}
                      >
                        {saving ? "기록 중..." : "오늘 시작하기"}
                      </Text>
                    </View>
                  </AnimatedPressable>

                  <Pressable onPress={submitPass} style={styles.debugBtn}>
                    <Text style={[styles.debugText, { color: theme.subText }]}>
                      나중에 적을게요
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </BlurView>
    </Animated.View>
  );
}

// 스타일 테마
const lightTheme = {
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  badgeBg: "#EEF2FF",
  inputBg: "rgba(255,255,255,0.6)",
  border: "rgba(255,255,255,0.8)",
  glowColor: "rgba(129, 140, 248, 0.25)",
};
const darkTheme = {
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  badgeBg: "rgba(167, 139, 250, 0.1)",
  inputBg: "rgba(255,255,255,0.05)",
  border: "rgba(255,255,255,0.1)",
  glowColor: "rgba(167, 139, 250, 0.3)",
};

const styles = StyleSheet.create({
  fullOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 99999 },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  glowCircle: {
    position: "absolute",
    top: "20%",
    right: -100,
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  kb: { flex: 1 },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  glassWrapper: { borderRadius: 36, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  sheet: { padding: 26 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  h1: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.1)",
  },
  timeText: { fontSize: 11, fontWeight: "800" },
  sub: { fontSize: 14, fontWeight: "600", marginBottom: 28 },
  inputContainer: { gap: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 56,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, fontWeight: "700" },
  submitMargin: { marginTop: 32 },
  primaryBtn: {
    height: 62,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 17, fontWeight: "900" },
  debugBtn: { marginTop: 24, alignSelf: "center" },
  debugText: { fontSize: 14, fontWeight: "700" },
});
