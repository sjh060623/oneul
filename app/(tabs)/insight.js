import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { BlurView } from "expo-blur";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGoals } from "../src/goalsStore";

const { width } = Dimensions.get("window");

// 레이아웃 상수
const CARD_MARGIN = 20;
const CARD_PADDING = 20;
const CHART_WIDTH = width - CARD_MARGIN * 2 - CARD_PADDING * 2;
const GRAPH_HEIGHT = 180;
const VERTICAL_PAD = 30;

const PROFILE_KEY = "PROFILE_V1";

// 거리 계산 함수
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

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

export default function Insight() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const { records } = useGoals();
  const [profile, setProfile] = useState({ name: "사용자" });

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();

    // 센서 로직
    DeviceMotion.setUpdateInterval(16);
    const subscription = DeviceMotion.addListener(({ rotation }) => {
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
    return () => subscription.remove();
  }, []);

  // 데이터 집계
  const { weeklyStats, maxVal } = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    records.forEach((r) => {
      if (!r.completedAt) return;
      const doneDate = new Date(r.completedAt);
      doneDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round(
        (now.getTime() - doneDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 0 && diffDays < 7) counts[6 - diffDays] += 1;
    });
    return { weeklyStats: counts, maxVal: Math.max(...counts, 5) };
  }, [records]);

  const streak = useMemo(() => {
    if (records.length === 0) return 0;
    const doneDates = new Set(
      records.map((r) => new Date(r.completedAt).toLocaleDateString())
    );
    let count = 0;
    let checkDate = new Date();
    while (doneDates.has(checkDate.toLocaleDateString())) {
      count++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return count;
  }, [records]);

  const { totalDistance, journeyPath, journeyPoints, goCount } = useMemo(() => {
    const goRecords = records
      .filter(
        (r) =>
          r.type === "go" &&
          r.completedAt &&
          r.coord?.latitude &&
          r.coord?.longitude
      )
      .sort((a, b) => a.completedAt - b.completedAt);
    let distSum = 0;
    const points = [];
    const path = Skia.Path.Make();
    if (goRecords.length > 0) {
      const lats = goRecords.map((r) => r.coord.latitude);
      const lons = goRecords.map((r) => r.coord.longitude);
      const minLat = Math.min(...lats),
        maxLat = Math.max(...lats);
      const minLon = Math.min(...lons),
        maxLon = Math.max(...lons);
      const latRange = maxLat - minLat || 0.001;
      const lonRange = maxLon - minLon || 0.001;
      goRecords.forEach((r, i) => {
        if (i > 0)
          distSum += getDistance(
            goRecords[i - 1].coord.latitude,
            goRecords[i - 1].coord.longitude,
            r.coord.latitude,
            r.coord.longitude
          );
        const x =
          ((r.coord.longitude - minLon) / lonRange) * (CHART_WIDTH - 60) + 30;
        const y =
          120 - (((r.coord.latitude - minLat) / latRange) * (120 - 60) + 30);
        points.push({ x, y });
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
    }
    return {
      totalDistance: distSum.toFixed(2),
      journeyPath: path,
      journeyPoints: points,
      goCount: goRecords.length,
    };
  }, [records]);

  const linePath = useMemo(() => {
    const path = Skia.Path.Make();
    const xStep = CHART_WIDTH / 6;
    weeklyStats.forEach((val, i) => {
      const x = i * xStep;
      const y =
        GRAPH_HEIGHT -
        VERTICAL_PAD * 2 -
        (val / maxVal) * (GRAPH_HEIGHT - VERTICAL_PAD * 2) +
        VERTICAL_PAD;
      if (i === 0) path.moveTo(x, y);
      else {
        const prevX = (i - 1) * xStep;
        const prevY =
          GRAPH_HEIGHT -
          VERTICAL_PAD * 2 -
          (weeklyStats[i - 1] / maxVal) * (GRAPH_HEIGHT - VERTICAL_PAD * 2) +
          VERTICAL_PAD;
        path.cubicTo(prevX + xStep / 2, prevY, x - xStep / 2, y, x, y);
      }
    });
    return path;
  }, [weeklyStats, maxVal]);

  const fillPath = useMemo(() => {
    const path = linePath.copy();
    path.lineTo(CHART_WIDTH, GRAPH_HEIGHT);
    path.lineTo(0, GRAPH_HEIGHT);
    path.close();
    return path;
  }, [linePath]);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* 통합된 기울기 배경 (Glow) */}
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
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <Text style={[styles.dateText, { color: theme.primary }]}>
            Insight Report
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>리포트</Text>
        </View>

        {/* 인사이트 카드 */}
        <GlassCard style={styles.cardMargin} isDark={isDark} intensity={30}>
          <View style={styles.insightRow}>
            <View
              style={[
                styles.insightIconBox,
                { backgroundColor: theme.primary + "33" },
              ]}
            >
              <Text style={{ fontSize: 20 }}>💡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.welcomeName, { color: theme.text }]}>
                인사이트
              </Text>
              <Text style={[styles.welcomeMsg, { color: theme.primary }]}>
                {profile.name}님은 오늘까지 {streak}일째 기록 중이에요.{" "}
                {goCount > 0
                  ? `${totalDistance}km의 여정을 담았습니다.`
                  : "작은 기록들이 모여 큰 힘이 돼요."}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* 활동 변화 그래프 카드 */}
        <GlassCard style={styles.cardMargin} isDark={isDark}>
          <Text
            style={[styles.sectionLabel, { color: theme.text, marginLeft: 0 }]}
          >
            최근 7일간의 변화
          </Text>
          <Canvas
            style={{ width: CHART_WIDTH, height: GRAPH_HEIGHT, marginTop: 10 }}
          >
            <Group opacity={0.05}>
              <Path
                path={`M 0 ${VERTICAL_PAD} L ${CHART_WIDTH} ${VERTICAL_PAD}`}
                color={theme.text}
                strokeWidth={1}
                style="stroke"
              />
              <Path
                path={`M 0 ${GRAPH_HEIGHT - VERTICAL_PAD} L ${CHART_WIDTH} ${
                  GRAPH_HEIGHT - VERTICAL_PAD
                }`}
                color={theme.text}
                strokeWidth={1}
                style="stroke"
              />
            </Group>
            <Path path={fillPath}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, GRAPH_HEIGHT)}
                colors={[theme.primary + "44", theme.primary + "00"]}
              />
            </Path>
            <Path
              path={linePath}
              color={theme.primary}
              style="stroke"
              strokeWidth={4}
              strokeCap="round"
              strokeJoin="round"
            />
            {weeklyStats.map((val, i) => {
              const cx = i * (CHART_WIDTH / 6);
              const cy =
                GRAPH_HEIGHT -
                VERTICAL_PAD * 2 -
                (val / maxVal) * (GRAPH_HEIGHT - VERTICAL_PAD * 2) +
                VERTICAL_PAD;
              return (
                <Circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={4}
                  color={isDark ? "#FFF" : theme.primary}
                />
              );
            })}
          </Canvas>
          <View style={[styles.daysRowContainer, { width: CHART_WIDTH }]}>
            {["6일전", "5일전", "4일전", "3일전", "2일전", "어제", "오늘"].map(
              (d, i) => (
                <View
                  key={i}
                  style={[
                    styles.dayLabelBox,
                    { left: i * (CHART_WIDTH / 6) - 20 },
                  ]}
                >
                  <Text style={[styles.dayText, { color: theme.subText }]}>
                    {d === "오늘" || d === "어제" ? d : d[0]}
                  </Text>
                </View>
              )
            )}
          </View>
        </GlassCard>

        {/* 조각의 여정(거리) 카드 */}
        <GlassCard style={styles.cardMargin} isDark={isDark}>
          <View style={styles.cardHeaderRow}>
            <Text
              style={[
                styles.sectionLabel,
                { color: theme.text, marginLeft: 0, marginBottom: 0 },
              ]}
            >
              여정
            </Text>
            <View
              style={[styles.badge, { backgroundColor: theme.primary + "22" }]}
            >
              <Text style={[styles.badgeText, { color: theme.primary }]}>
                Location
              </Text>
            </View>
          </View>
          <View style={styles.distanceInfo}>
            <Text style={[styles.distanceValue, { color: theme.text }]}>
              {totalDistance} <Text style={styles.unitText}>km</Text>
            </Text>
            <Text style={[styles.distanceLabel, { color: theme.subText }]}>
              {goCount > 0
                ? "함께 여행한 거리예요."
                : "아직 완료된 장소가 없어요."}
            </Text>
          </View>
          <Canvas style={{ width: CHART_WIDTH, height: 120 }}>
            {journeyPoints.length > 1 && (
              <Path
                path={journeyPath}
                color={theme.primary}
                style="stroke"
                strokeWidth={2}
                opacity={0.3}
                strokeCap="round"
              />
            )}
            {journeyPoints.map((p, i) => (
              <Group key={i}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  color={theme.primary}
                  opacity={0.15}
                />
                <Circle cx={p.x} cy={p.y} r={2} color={theme.primary} />
              </Group>
            ))}
          </Canvas>
        </GlassCard>

        {/* 하단 요약 카드 */}
        <View style={styles.statsRow}>
          <GlassCard isDark={isDark} style={styles.miniCardGlass}>
            <Text style={styles.miniEmoji}>✨</Text>
            <Text style={[styles.miniValue, { color: theme.text }]}>
              {records.length}개
            </Text>
            <Text style={[styles.miniLabel, { color: theme.subText }]}>
              누적 기록
            </Text>
          </GlassCard>
          <GlassCard isDark={isDark} style={styles.miniCardGlass}>
            <Text style={styles.miniEmoji}>🔥</Text>
            <Text style={[styles.miniValue, { color: theme.text }]}>
              {streak}일
            </Text>
            <Text style={[styles.miniLabel, { color: theme.subText }]}>
              연속 성취
            </Text>
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// 공통 테마
const lightTheme = {
  background: "#F0F2F9",
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  glowColor: "rgba(129, 140, 248, 0.15)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  glowColor: "rgba(167, 139, 250, 0.2)",
};

// 통합 스타일
const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  header: { paddingHorizontal: 24, marginTop: 20, marginBottom: 24 },
  dateText: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800" },
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
  cardMargin: { marginHorizontal: 20, marginBottom: 20 },
  insightRow: { flexDirection: "row", alignItems: "center" },
  insightIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  welcomeName: { fontSize: 15, fontWeight: "700" },
  welcomeMsg: { fontSize: 13, fontWeight: "500", marginTop: 2, lineHeight: 18 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
    marginLeft: 4,
  },
  daysRowContainer: { height: 20, marginTop: 15, position: "relative" },
  dayLabelBox: { position: "absolute", width: 40, alignItems: "center" },
  dayText: { fontSize: 11, fontWeight: "700" },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: "800" },
  distanceInfo: { marginBottom: 15 },
  distanceValue: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  unitText: { fontSize: 16, fontWeight: "600", opacity: 0.6 },
  distanceLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    justifyContent: "space-between",
    marginBottom: 80,
  },
  miniCardGlass: { width: "48%" },
  miniEmoji: { fontSize: 24, marginBottom: 8 },
  miniValue: { fontSize: 20, fontWeight: "800" },
  miniLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});
