// app/(tabs)/home.js
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GeoStatus from "../components/geo";
import { useGoals } from "../src/goalsStore";

export default function Home() {
  const { goals, completeGoal, removeGoal } = useGoals();

  const leftCount = goals.length;

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
      <Text style={styles.title}>오늘</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>오늘 목표</Text>
            <Pressable
              onPress={() => router.push("/add-goal")}
              style={styles.addBtn}
            >
              <Text style={styles.addBtnText}>+ 목표 추가</Text>
            </Pressable>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>현재 상태</Text>
            <Text style={styles.statusValue}>남은 목표 {leftCount}개</Text>
          </View>

          {normalGoals.length === 0 ? (
            <Text style={styles.emptyText}>
              일반 목표가 없어요. 추가해보세요.
            </Text>
          ) : (
            <View style={{ marginTop: 12 }}>
              {normalGoals.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => completeGoal(g.id)} // ✅ 누르면 완료 → 홈에서 사라지고 기록으로 이동
                  onLongPress={() => removeGoal(g.id)}
                  style={styles.goalRow}
                >
                  <View style={styles.dot} />
                  <Text style={styles.goalText} numberOfLines={1}>
                    {g.text}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.hint}>누르면 완료 · 길게 누르면 삭제</Text>
            </View>
          )}

          {goCoordGoals.length ? (
            <View style={{ marginTop: 14 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>~가기 (좌표)</Text>
                <Text style={styles.sectionCount}>{goCoordGoals.length}</Text>
              </View>

              {goCoordGoals.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => completeGoal(g.id)} // ✅ 완료 처리
                  onLongPress={() => removeGoal(g.id)}
                  style={styles.goalRow}
                >
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalText} numberOfLines={1}>
                      {g.text}
                    </Text>
                    <Text style={styles.coordText} numberOfLines={1}>
                      {g.coord.latitude.toFixed(6)},{" "}
                      {g.coord.longitude.toFixed(6)}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Text style={styles.hint}>누르면 완료 · 길게 누르면 삭제</Text>
            </View>
          ) : null}
        </View>

        <GeoStatus radiusM={80} goalRadiusM={120} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  addBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#000", fontSize: 12, fontWeight: "900" },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  statusLabel: { color: "#6f7377", fontSize: 12, fontWeight: "800" },
  statusValue: { color: "#fff", fontSize: 12, fontWeight: "900" },

  emptyText: { color: "#6f7377", marginTop: 12, fontSize: 12 },

  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
  },
  dot: { width: 10, height: 10, borderRadius: 10, backgroundColor: "#fff" },
  goalText: { color: "#fff", fontSize: 13, fontWeight: "900", flex: 1 },
  coordText: {
    color: "#6f7377",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
  },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sectionCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  hint: { color: "#6f7377", fontSize: 12, marginTop: 8, fontWeight: "800" },
});
