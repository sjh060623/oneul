import { router } from "expo-router";
import React, { useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DailySetupOverlay from "../components/DailySetupOverlay";
import GeoStatus from "../components/geo";
import HomeMap from "../components/homeMap";
import FirstLaunchTutorial from "../FirstLaunchTutorial";
import { useGoals } from "../src/goalsStore";
import { useGoGoalsWithDistance } from "../src/useGoGoalsWithDistance";

const AnimatedPressable = ({ children, onPress, onLongPress, style }) => {
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
  const { goGoalsWithDistance } = useGoGoalsWithDistance({ pollMs: 5000 });
  const { goals, records, reminderTime, completeGoal, removeGoal } = useGoals();

  const progressData = useMemo(() => {
    const now = new Date();
    const [targetH, targetM] = reminderTime.split(":").map(Number);

    let lastReset = new Date();
    lastReset.setHours(targetH, targetM, 0, 0);

    if (now < lastReset) {
      lastReset.setDate(lastReset.getDate() - 1);
    }

    const lastResetTs = lastReset.getTime();

    const completedInCurrentCycle = records.filter(
      (r) => r.completedAt && r.completedAt >= lastResetTs
    ).length;

    const totalInCurrentCycle = goals.length + completedInCurrentCycle;
    const progressValue =
      totalInCurrentCycle > 0
        ? completedInCurrentCycle / totalInCurrentCycle
        : 0;

    return {
      completedCount: completedInCurrentCycle,
      totalCount: totalInCurrentCycle,
      progress: progressValue,
    };
  }, [records, goals.length, reminderTime]);

  const { progress, completedCount } = progressData;

  const goCoordGoals = useMemo(
    () =>
      goals.filter(
        (g) =>
          g?.coord && (g.type === "go" || String(g.text || "").includes("가기"))
      ),
    [goals]
  );
  const normalGoals = useMemo(() => goals.filter((g) => !g?.coord), [goals]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("ko-KR", {
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </Text>
          <Text style={styles.title}>오늘의 목표</Text>
        </View>
        <Pressable
          onPress={() => router.push("/add-goal")}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* 성취도 */}
        <View style={styles.progressCard}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>
              현재 {Math.round(progress * 100)}% 달성
            </Text>
            <Text style={styles.progressSub}>{goals.length}개 남음</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        {/* 리스트 */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>할 일</Text>
          {normalGoals.length === 0 && goCoordGoals.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>모든 목표를 달성했습니다! ✨</Text>
            </View>
          ) : (
            normalGoals.map((g) => (
              <AnimatedPressable
                key={g.id}
                onPress={() => completeGoal(g.id)}
                onLongPress={() => removeGoal(g.id)}
                style={styles.goalCard}
              >
                <View style={styles.checkCircle} />
                <Text style={styles.goalText}>{g.text}</Text>
              </AnimatedPressable>
            ))
          )}
        </View>

        {goCoordGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>장소 방문</Text>
            {goGoalsWithDistance.map((g) => (
              <AnimatedPressable
                key={g.id}
                onPress={() => completeGoal(g.id)}
                onLongPress={() => removeGoal(g.id)}
                style={[styles.goalCard, styles.locationCard]}
              >
                <View style={styles.locationIcon}>
                  <Text style={{ fontSize: 10 }}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalText}>{g.text}</Text>
                  <Text style={styles.distanceText}>
                    {g.meters == null
                      ? "위치 확인 중..."
                      : `약 ${Math.round(g.meters)}m 남음`}
                  </Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}

        <View style={styles.mapContainer}>
          <HomeMap />
        </View>
        <GeoStatus radiusM={80} goalRadiusM={120} />
      </ScrollView>
      <FirstLaunchTutorial />
      <DailySetupOverlay />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 24,
  },
  dateText: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#000", fontSize: 24, fontWeight: "600" },
  progressCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#262626",
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 12,
  },
  progressLabel: { color: "#fff", fontSize: 15, fontWeight: "800" },
  progressSub: { color: "#6f7377", fontSize: 13, fontWeight: "600" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#262626",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    color: "#6f7377",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4,
  },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    padding: 18,
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#333",
    marginRight: 14,
  },
  goalText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  locationCard: { borderColor: "#312E81" },
  locationIcon: {
    width: 22,
    height: 22,
    backgroundColor: "#312E81",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  distanceText: {
    color: "#6366F1",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  emptyBox: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#444", fontSize: 15, fontWeight: "700" },
  mapContainer: {
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#262626",
  },
});
