import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";

const PROFILE_KEY = "PROFILE_V1";

const ShareCard = forwardRef(({ data, isDark }, ref) => {
  const viewRef = useRef();
  const [internalUserName, setInternalUserName] = useState("사용자");

  useEffect(() => {
    const loadName = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setInternalUserName(parsed.name || "사용자");
        }
      } catch (e) {
        console.error("ShareCard 로드 에러:", e);
      }
    };
    loadName();
  }, [data]);

  useImperativeHandle(ref, () => ({
    async captureAndShare() {
      await new Promise((resolve) => setTimeout(resolve, 400));

      try {
        const uri = await captureRef(viewRef, {
          format: "png",
          quality: 1.0,
          result: "tmpfile",
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        }
      } catch (e) {
        console.error("캡처 실패:", e);
      }
    },
  }));

  if (!data) return null;

  return (
    <View style={styles.offscreenContainer} collapsable={false}>
      <View
        ref={viewRef}
        collapsable={false}
        style={[styles.card, isDark ? styles.darkCard : styles.lightCard]}
      >
        <Text style={[styles.brand, isDark ? styles.darkSub : styles.lightSub]}>
          오늘의 하루
        </Text>

        <View style={styles.imageWrapper}>
          {data.photoUri ? (
            <Image source={{ uri: data.photoUri }} style={styles.image} />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                isDark ? styles.darkPh : styles.lightPh,
              ]}
            >
              <Text style={{ fontSize: 60 }}>✨</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text
            style={[styles.date, isDark ? styles.darkSub : styles.lightSub]}
          >
            {data.dateKey}
          </Text>
          <Text
            style={[styles.goal, isDark ? styles.darkText : styles.lightText]}
          >
            {data.text}
          </Text>
          <View
            style={[styles.divider, isDark ? styles.darkDiv : styles.lightDiv]}
          />
          <Text
            style={[styles.memo, isDark ? styles.darkText : styles.lightText]}
            numberOfLines={5}
          >
            {data.memo || "오늘 하루도 소중한 기록을 남겼습니다."}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              isDark ? styles.darkSub : styles.lightSub,
            ]}
          >
            {internalUserName}님의 기록
          </Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  offscreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
    alignItems: "center",
  },
  card: {
    width: 380,
    padding: 35,
    borderRadius: 30,
    alignItems: "center",
  },
  lightCard: { backgroundColor: "#FFFFFF" },
  darkCard: { backgroundColor: "#1A1A24" },
  brand: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 25,
    letterSpacing: 2,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 25,
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  lightPh: { backgroundColor: "#F1F5F9" },
  darkPh: { backgroundColor: "#2D2D3D" },
  content: { width: "100%", alignItems: "center" },
  date: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  goal: {
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 20,
  },
  divider: { width: 40, height: 4, borderRadius: 2, marginBottom: 20 },
  lightDiv: { backgroundColor: "#818CF8" },
  darkDiv: { backgroundColor: "#A78BFA" },
  memo: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  lightText: { color: "#2D3748" },
  darkText: { color: "#FFFFFF" },
  lightSub: { color: "#818CF8" },
  darkSub: { color: "#A78BFA" },
  footer: { marginTop: 40 },
  footerText: { fontSize: 14, fontWeight: "700", letterSpacing: -0.5 },
});

export default ShareCard;
