import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DailySetupOverlay from "../components/DailySetupOverlay";
import GeoStatus from "../components/geo";
import HomeMap from "../components/homeMap";
import FirstLaunchTutorial from "../FirstLaunchTutorial";
import { useGoals } from "../src/goalsStore";
import { useGoGoalsWithDistance } from "../src/useGoGoalsWithDistance";

const { width, height } = Dimensions.get("window");
const PROFILE_KEY = "PROFILE_V1";
const CHEER_MESSAGES = [
  "오늘도 당신의 속도대로 걸어가요. ✨",
  "작은 조각들이 모여 큰 그림이 될 거예요. 🕊️",
  "반짝이는 당신의 오늘을 응원합니다. 💛",
  "충분히 잘하고 있어요, 조급해하지 말아요. 🌱",
  "당신만의 리듬으로 채워가는 멋진 하루! 🎨",
];
const GlassCard = ({ children, style, intensity = 40, isDark }) => (
  <View
    style={[
      styles.glassWrapper,
      style,
      isDark ? styles.darkBorder : styles.lightBorder,
    ]}
  >
    <BlurView
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={styles.glassPadding}
    >
      {children}
    </BlurView>
  </View>
);

const AnimatedPressable = ({ children, onPress, onLongPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: 0.96,
      tension: 40,
      friction: 7,
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      tension: 40,
      friction: 5,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function Home() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const [profile, setProfile] = useState({ name: "", photoUri: "" });
  const [cheerMsg, setCheerMsg] = useState("");

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const { goGoalsWithDistance } = useGoGoalsWithDistance({ pollMs: 5000 });
  const { goals, records, reminderTime, completeGoal, removeGoal } = useGoals();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setProfile({
            name: parsed.name || "사용자",
            photoUri: parsed.photoUri || "",
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    const randomIdx = Math.floor(Math.random() * CHEER_MESSAGES.length);
    setCheerMsg(CHEER_MESSAGES[randomIdx]);
    loadProfile();

    DeviceMotion.setUpdateInterval(16);
    const motionSub = DeviceMotion.addListener(({ rotation }) => {
      if (rotation) {
        const { gamma, beta } = rotation;
        Animated.spring(tiltX, {
          toValue: gamma * 50,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.spring(tiltY, {
          toValue: (beta - 1) * 50,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    });

    const appStateSub = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
      }
    });

    return () => {
      motionSub.remove();
      appStateSub.remove();
    };
  }, []);

  const confirmDelete = (id) => {
    Alert.alert("목표 삭제", "이 목표를 정말 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => removeGoal(id) },
    ]);
  };

  const progressData = useMemo(() => {
    const now = new Date();
    const [targetH, targetM] = reminderTime.split(":").map(Number);
    let lastReset = new Date();
    lastReset.setHours(targetH, targetM, 0, 0);
    if (now < lastReset) lastReset.setDate(lastReset.getDate() - 1);

    const completedInCurrentCycle = records.filter(
      (r) => r.completedAt && r.completedAt >= lastReset.getTime()
    ).length;
    const totalInCurrentCycle = goals.length + completedInCurrentCycle;
    return {
      progress:
        totalInCurrentCycle > 0
          ? completedInCurrentCycle / totalInCurrentCycle
          : 0,
    };
  }, [records, goals.length, reminderTime]);

  const { progress } = progressData;

  // 목표 필터링
  const goCoordGoals = useMemo(() => goals.filter((g) => g?.coord), [goals]);
  const normalGoals = useMemo(() => goals.filter((g) => !g?.coord), [goals]);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateText, { color: theme.primary }]}>
              {new Date().toLocaleDateString("ko-KR", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </Text>
            <Text style={[styles.title, { color: theme.text }]}>
              오늘의 하루
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/add-goal")}
            style={[styles.addBtn, { backgroundColor: theme.addBtnBg }]}
          >
            <Text style={[styles.addBtnText, { color: theme.primary }]}>+</Text>
          </Pressable>
        </View>

        {/* 웰컴 카드 */}
        <GlassCard style={styles.cardMargin} isDark={isDark} intensity={30}>
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeAvatarContainer}>
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.welcomeAvatar}
                />
              ) : (
                <View style={styles.welcomeAvatarPlaceholder}>
                  <Text style={{ fontSize: 20 }}>{isDark ? "🌙" : "☀️"}</Text>
                </View>
              )}
            </View>
            <View style={styles.welcomeTextContent}>
              <Text style={[styles.welcomeName, { color: theme.text }]}>
                안녕하세요, {profile.name || "사용자"}님
              </Text>
              <Text style={[styles.welcomeMsg, { color: theme.primary }]}>
                {cheerMsg}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* 진행률 카드 */}
        <GlassCard style={styles.cardMargin} isDark={isDark}>
          <View style={styles.progressInfo}>
            <View>
              <Text style={[styles.progressLabel, { color: theme.subText }]}>
                {isDark ? "잘 해내고 있어요" : "차곡차곡 채워가는 중"}
              </Text>
              <Text style={[styles.progressValueText, { color: theme.text }]}>
                {Math.round(progress * 100)}% 완료
              </Text>
            </View>
            <View
              style={[styles.progressBadge, { backgroundColor: theme.badgeBg }]}
            >
              <Text
                style={[styles.progressBadgeText, { color: theme.primary }]}
              >
                {goals.length}개 남음
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.progressBarBg,
              { backgroundColor: theme.progressTrack },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </GlassCard>

        {/* 일반 할 일 목록 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: theme.subText }]}>
              나의 할 일
            </Text>
            <Text style={[styles.sectionHint, { color: theme.primary + "99" }]}>
              눌러서 완료 • 길게 눌러 삭제
            </Text>
          </View>
          {normalGoals.length === 0 && goCoordGoals.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={[styles.emptyText, { color: theme.subText }]}>
                포근한 하루 되세요 ✨
              </Text>
            </View>
          )}
          {normalGoals.map((g) => (
            <AnimatedPressable
              key={g.id}
              onPress={() => completeGoal(g.id)}
              onLongPress={() => confirmDelete(g.id)}
              style={{ marginBottom: 12 }}
            >
              <GlassCard isDark={isDark} intensity={20} style={styles.goalCard}>
                <View style={styles.goalCardContent}>
                  <View
                    style={[
                      styles.checkCircle,
                      { borderColor: theme.progressTrack },
                    ]}
                  />
                  <Text style={[styles.goalText, { color: theme.text }]}>
                    {g.text}
                  </Text>
                </View>
              </GlassCard>
            </AnimatedPressable>
          ))}
        </View>

        {/* 위치 기반 할 일 목록 */}
        {goCoordGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: theme.subText }]}>
                발걸음이 닿는 곳
              </Text>
            </View>
            {goGoalsWithDistance.map((g) => (
              <AnimatedPressable
                key={g.id}
                onPress={() => completeGoal(g.id)}
                onLongPress={() => confirmDelete(g.id)}
                style={{ marginBottom: 12 }}
              >
                <GlassCard
                  isDark={isDark}
                  intensity={20}
                  style={styles.goalCard}
                >
                  <View style={styles.goalCardContent}>
                    <View
                      style={
                        isDark
                          ? styles.locationPulse
                          : [
                              styles.locationIndicator,
                              { backgroundColor: theme.primary },
                            ]
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalText, { color: theme.text }]}>
                        {g.text}
                      </Text>
                      <Text
                        style={[styles.distanceText, { color: theme.primary }]}
                      >
                        {g.meters == null
                          ? "위치를 찾는 중..."
                          : `${Math.round(g.meters)}m 근처에 있어요.`}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </AnimatedPressable>
            ))}
          </View>
        )}

        {/* 지도 및 하단 정보 */}
        <View style={styles.mapWrapper}>
          <View
            style={[
              styles.mapContainer,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <HomeMap />
          </View>
        </View>
        <GeoStatus radiusM={80} goalRadiusM={120} />
      </ScrollView>

      {/* 오버레이  */}
      <FirstLaunchTutorial />
      <DailySetupOverlay />
    </SafeAreaView>
  );
}

const lightTheme = {
  background: "#F0F2F9",
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  addBtnBg: "#FFF",
  badgeBg: "#FFF",
  progressTrack: "rgba(0,0,0,0.05)",
  cardBg: "#FFF",
  border: "rgba(0,0,0,0.05)",
  glowColor: "rgba(129, 140, 248, 0.15)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  addBtnBg: "rgba(255,255,255,0.1)",
  badgeBg: "rgba(167, 139, 250, 0.2)",
  progressTrack: "rgba(255,255,255,0.1)",
  cardBg: "#16161D",
  border: "rgba(255,255,255,0.1)",
  glowColor: "rgba(167, 139, 250, 0.2)",
};

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24 },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  glowCircle: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 24,
  },
  dateText: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800" },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  addBtnText: { fontSize: 28, fontWeight: "300" },
  glassWrapper: { borderRadius: 24, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  glassPadding: { padding: 20 },
  cardMargin: { marginBottom: 24 },
  welcomeRow: { flexDirection: "row", alignItems: "center" },
  welcomeAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  welcomeAvatar: { width: 48, height: 48 },
  welcomeAvatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTextContent: { marginLeft: 14, flex: 1 },
  welcomeName: { fontSize: 14, fontWeight: "700" },
  welcomeMsg: { fontSize: 13, fontWeight: "500", marginTop: 2 },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  progressValueText: { fontSize: 18, fontWeight: "700" },
  progressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  progressBadgeText: { fontSize: 12, fontWeight: "700" },
  progressBarBg: { height: 6, borderRadius: 3, marginTop: 15 },
  progressBarFill: { height: "100%", borderRadius: 3 },
  section: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: { fontSize: 14, fontWeight: "700" },
  sectionHint: { fontSize: 10, fontWeight: "600", marginBottom: 2 },
  goalCard: { borderRadius: 20 },
  goalCardContent: { flexDirection: "row", alignItems: "center" },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 14,
  },
  goalText: { fontSize: 16, fontWeight: "600" },
  locationIndicator: { width: 6, height: 6, borderRadius: 3, marginRight: 14 },
  locationPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A78BFA",
    marginRight: 14,
  },
  distanceText: { fontSize: 12, marginTop: 2, fontWeight: "500" },
  emptyBox: { paddingVertical: 40, alignItems: "center" },
  emptyText: { fontSize: 15, fontWeight: "500" },
  mapWrapper: {
    marginBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  mapContainer: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    padding: 4,
  },
});
