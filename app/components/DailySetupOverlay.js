import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useGoals } from "../src/goalsStore";

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
  const { addGoal, reminderTime, clearPreviousDaysGoals } = useGoals();
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState(["", "", "", "", ""]);
  const [saving, setSaving] = useState(false);

  const inputRefs = useRef([]);

  const pad2 = (n) => String(n).padStart(2, "0");
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const checkDue = async () => {
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
        if (!visible) clearPreviousDaysGoals();
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkDue();
    const interval = setInterval(checkDue, 1000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkDue();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [reminderTime, enabled]);

  const setAt = (idx, v) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const submit = async () => {
    const trimmed = items.filter((s) => s.trim());
    if (saving || trimmed.length < 5) return;
    setSaving(true);
    try {
      for (const text of trimmed.slice(0, 5)) {
        const formattedText = text.endsWith("하기") ? text : `${text} 하기`;
        addGoal({ text: formattedText, type: "todo", coord: null });
      }
      await AsyncStorage.setItem(
        DAILY_DONE_KEY,
        JSON.stringify({ lastDoneDate: todayKey() })
      );
      setVisible(false);
      Keyboard.dismiss();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  const submitPass = async () => {
    Alert.alert(
      "목표 작성 건너뛰기",
      "오늘의 목표를 적지 않고 넘어갈까요? (내일 다시 나타납니다)",
      [
        { text: "취소", style: "cancel" },
        {
          text: "건너뛰기",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.setItem(
                DAILY_DONE_KEY,
                JSON.stringify({ lastDoneDate: todayKey() })
              );
              setVisible(false);
              Keyboard.dismiss();
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kb}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.sheet}>
            {/* 상단 텍스트 */}
            <View style={styles.header}>
              <Text style={styles.h1}>오늘의 목표</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>
                  매일{reminderTime}에 리셋돼요
                </Text>
              </View>
            </View>

            <Text style={styles.sub}>
              성장을 위해 5가지 할 일을 적어주세요.
            </Text>

            {/* 입력 영역 */}
            <View style={styles.inputContainer}>
              {items.map((v, idx) => (
                <View key={idx} style={styles.inputRow}>
                  <View style={styles.numberBox}>
                    <Text style={styles.numberText}>{idx + 1}</Text>
                  </View>
                  <TextInput
                    ref={(el) => (inputRefs.current[idx] = el)}
                    value={v}
                    onChangeText={(t) => setAt(idx, t)}
                    placeholder="무엇을 할까요?"
                    style={styles.input}
                    placeholderTextColor="#333"
                    returnKeyType={idx === 4 ? "done" : "next"}
                    onSubmitEditing={() => {
                      if (idx < 4) inputRefs.current[idx + 1].focus();
                      else submit();
                    }}
                  />
                </View>
              ))}
            </View>

            {/* 하단 버튼 */}
            <AnimatedPressable
              onPress={submit}
              disabled={items.filter((s) => s.trim()).length < 5 || saving}
            >
              <View style={styles.primaryBtn}>
                <Text style={styles.primaryText}>
                  {saving ? "저장 중..." : "오늘 시작하기"}
                </Text>
              </View>
            </AnimatedPressable>

            <Pressable onPress={submitPass} style={styles.debugBtn}>
              <Text style={styles.debugText}>나중에 적을게요.</Text>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

import { TouchableWithoutFeedback } from "react-native";

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 9999,
  },
  kb: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  sheet: {
    backgroundColor: "#0b0b0b",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  h1: { color: "#fff", fontSize: 24, fontWeight: "900" },
  timeBadge: {
    backgroundColor: "#161616",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#262626",
  },
  timeText: { color: "#6366F1", fontSize: 11, fontWeight: "800" },
  sub: { color: "#6f7377", fontSize: 14, fontWeight: "600", marginBottom: 24 },

  inputContainer: { gap: 10 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 52,
    borderWidth: 1,
    borderColor: "#262626",
  },
  numberBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  numberText: { color: "#6366F1", fontSize: 13, fontWeight: "900" },
  input: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700" },

  primaryBtn: {
    marginTop: 24,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  primaryText: { color: "#000", fontSize: 16, fontWeight: "900" },

  debugBtn: { marginTop: 20, alignSelf: "center" },
  debugText: { color: "#6366F1", fontSize: 12, fontWeight: "700" },
});
