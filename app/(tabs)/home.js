import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GeoStatus from "../components/geo";
import { useGoals } from "../src/goalsStore";

export default function Home() {
  const { goals, toggleGoal, removeGoal } = useGoals();

  const doneCount = useMemo(() => goals.filter((g) => g.done).length, [goals]);

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
            <Text style={styles.statusValue}>
              {doneCount}/{goals.length} 달성
            </Text>
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
                  onPress={() => toggleGoal(g.id)}
                  style={[styles.goalRow, g.done && styles.goalRowDone]}
                >
                  <View style={[styles.dot, g.done && styles.dotDone]} />
                  <Text
                    style={[styles.goalText, g.done && styles.goalTextDone]}
                    numberOfLines={1}
                  >
                    {g.text}
                  </Text>
                </Pressable>
              ))}
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
                  onPress={() => toggleGoal(g.id)}
                  onLongPress={() => removeGoal?.(g.id)}
                  style={[styles.goalRow, g.done && styles.goalRowDone]}
                >
                  <View style={[styles.dot, g.done && styles.dotDone]} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.goalText, g.done && styles.goalTextDone]}
                      numberOfLines={1}
                    >
                      {g.text}
                    </Text>
                    <Text style={styles.coordText} numberOfLines={1}>
                      {g.coord.latitude.toFixed(6)},{" "}
                      {g.coord.longitude.toFixed(6)}
                    </Text>
                  </View>
                </Pressable>
              ))}

              <Text style={styles.sectionHint}>길게 누르면 삭제</Text>
            </View>
          ) : null}
        </View>

        <GeoStatus radiusM={80} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
  },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", marginBottom: 14 },
  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  addBtn: {
    backgroundColor: "#1f1f1f",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  statusLabel: { color: "#9aa0a6", fontSize: 13, fontWeight: "600" },
  statusValue: { color: "#fff", fontSize: 13, fontWeight: "700" },
  emptyText: { color: "#666", fontSize: 13, paddingTop: 12 },
  goalList: { gap: 10, paddingBottom: 24 },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0c0c0c",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  goalRowDone: { opacity: 0.75 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#3a3a3a",
    marginRight: 10,
  },
  dotDone: { borderColor: "#fff" },
  goalText: { color: "#fff", fontSize: 14, fontWeight: "600", flex: 1 },
  goalTextDone: { textDecorationLine: "line-through", color: "#9aa0a6" },
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
  coordText: {
    color: "#6f7377",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  sectionHint: { color: "#6f7377", fontSize: 12, marginTop: 8 },
});
