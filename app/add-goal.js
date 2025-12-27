import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useGoals } from "./src/goalsStore";

export default function AddGoalModal() {
  const { addGoal } = useGoals();
  const [place, setPlace] = useState("");
  const [title, setTitle] = useState("");

  const placePlaceholders = [
    "집",
    "학교",
    "학원",
    "카페",
    "도서관",
    "헬스장",
    "회사",
    "편의점",
    "공원",
    "스터디룸",
    "병원",
    "지하철역",
  ];

  const todoPlaceholders = [""];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeY = React.useRef(new Animated.Value(0)).current;
  const todoY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tick = () => {
      Animated.parallel([
        Animated.timing(placeY, {
          toValue: -8,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(todoY, {
          toValue: -8,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;

        setPlaceholderIndex((i) => (i + 1) % placePlaceholders.length);
        placeY.setValue(10);
        todoY.setValue(10);

        Animated.parallel([
          Animated.timing(placeY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(todoY, {
            toValue: 0,
            duration: 220,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      });
    };

    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [placeY, todoY, placePlaceholders.length]);

  const onAdd = () => {
    const p = place.trim();
    const t = title.trim();

    if (!t) {
      Alert.alert("할 일 필요", "할 일을 입력해 주세요.");
      return;
    }

    const combined = p ? `${p} 에서 ${t} 하기` : t;

    addGoal(combined);
    setTitle("");
    setPlace("");
    Keyboard.dismiss();
    router.back();
  };

  let date = new Date();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>오늘은?</Text>

        <View style={styles.sentenceBox}>
          <View>
            <View style={styles.sentenceRow}>
              <View style={[styles.inputWrap, styles.inlineSmall]}>
                {!place ? (
                  <Animated.Text
                    pointerEvents="none"
                    style={[
                      styles.placeholderText,
                      { transform: [{ translateY: placeY }] },
                    ]}
                    numberOfLines={1}
                  >
                    {placePlaceholders[placeholderIndex]}
                  </Animated.Text>
                ) : null}
                <TextInput
                  value={place}
                  onChangeText={setPlace}
                  placeholder=""
                  placeholderTextColor="#777"
                  style={[styles.input, styles.inputNoBorder]}
                  returnKeyType="next"
                  onSubmitEditing={() => {}}
                />
              </View>

              <Pressable
                onPress={() => Alert.alert("지도 선택", "미완입니다")}
                style={styles.mapBtn}
              >
                <Text style={styles.mapBtnText}>지도</Text>
              </Pressable>
            </View>
            <Text style={[styles.word, { paddingVertical: 10 }]}>에서</Text>

            <View style={[styles.inputWrap, styles.inlineWide]}>
              {!title ? (
                <Animated.Text
                  pointerEvents="none"
                  style={[
                    styles.placeholderText,
                    { transform: [{ translateY: todoY }] },
                  ]}
                  numberOfLines={1}
                >
                  {todoPlaceholders[placeholderIndex]}
                </Animated.Text>
              ) : null}
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder=""
                placeholderTextColor="#777"
                style={[styles.input, styles.inputNoBorder]}
                returnKeyType="done"
                onSubmitEditing={onAdd}
                autoFocus
              />
            </View>
          </View>
          <Text style={styles.word}>하기</Text>
        </View>

        <Text style={styles.hintText}>
          {title.trim()
            ? `오늘은 ${
                place.trim() ? place.trim() : "(어디서?)"
              }에서 ${title.trim()} 하기`
            : "할 일을 입력해 주세요."}
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.btn, styles.ghost]}
          >
            <Text style={styles.ghostText}>취소</Text>
          </Pressable>
          <Pressable onPress={onAdd} style={[styles.btn, styles.primary]}>
            <Text style={styles.primaryText}>추가</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0b0b0b",
    justifyContent: "flex-start",
    padding: 5,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  sheet: {
    backgroundColor: "#0b0b0b",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    color: "#fff",
  },
  inputWrap: {
    position: "relative",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    justifyContent: "center",
  },
  inputNoBorder: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
  },
  placeholderText: {
    position: "absolute",
    left: 12,
    right: 12,
    color: "#777",
    fontSize: 14,
    fontWeight: "600",
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2a2a2a" },
  ghostText: { color: "#fff", fontWeight: "800" },
  primary: { backgroundColor: "#fff" },
  primaryText: { color: "#000", fontWeight: "900" },
  fieldLabel: {
    color: "#9aa0a6",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  mapBtn: {
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    minWidth: 54,
  },
  mapBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  sentenceBox: {
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  word: {
    color: "#9aa0a6",
    fontSize: 12,
    fontWeight: "800",
  },
  sentenceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  inlineSmall: {
    minWidth: 110,
    flexGrow: 1,
  },
  inlineWide: {
    minWidth: 160,
    flexGrow: 2,
  },
  hintText: {
    color: "#6f7377",
    fontSize: 12,
    marginTop: 10,
  },
});
