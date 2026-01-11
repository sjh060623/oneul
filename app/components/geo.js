import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import { startHomeAndGoalsGeofence, stopHomeGeofence } from "../geoBackground";
import { useGoals } from "../src/goalsStore";

function toRad(v) {
  return (v * Math.PI) / 180;
}
function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

const HOME_KEY = "HOME_COORD_V1";

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

export default function GeoStatus({ radiusM = 80 }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const { goals } = useGoals();
  const [home, setHome] = useState(null);
  const homePollRef = useRef(null);
  const lastHomeRawRef = useRef(null);
  const lastGeofenceSigRef = useRef(null);

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  // 집 위치 로드
  useEffect(() => {
    let mounted = true;
    const loadHome = async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (!mounted || saved === lastHomeRawRef.current) return;
        lastHomeRawRef.current = saved;
        const next = saved ? JSON.parse(saved) : null;
        setHome(next?.latitude && next?.longitude ? next : null);
      } catch {
        if (mounted) setHome(null);
      }
    };
    loadHome();
    homePollRef.current = setInterval(loadHome, 1500);
    return () => {
      mounted = false;
      clearInterval(homePollRef.current);
    };
  }, []);

  const [pos, setPos] = useState(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const pollRef = useRef(null);

  // 실시간 위치 추적 및 센서 로직
  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted || status !== "granted") return;
      const pull = async () => {
        try {
          const cur = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!mounted) return;
          setPos({
            latitude: cur.coords.latitude,
            longitude: cur.coords.longitude,
          });
          setLastFixAt(Date.now());
        } catch {}
      };
      await pull();
      pollRef.current = setInterval(pull, 5000);
    };
    boot();

    // 센서 로직 통합
    DeviceMotion.setUpdateInterval(16);
    const motionSub = DeviceMotion.addListener(({ rotation }) => {
      if (rotation) {
        const { gamma, beta } = rotation;
        Animated.spring(tiltX, {
          toValue: gamma * 30,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.spring(tiltY, {
          toValue: (beta - 1) * 30,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    });

    return () => {
      mounted = false;
      clearInterval(pollRef.current);
      motionSub.remove();
    };
  }, []);

  const dist = useMemo(
    () => (home && pos ? distanceMeters(home, pos) : null),
    [home, pos]
  );
  const insideHome = useMemo(
    () => (dist != null ? dist <= radiusM : null),
    [dist, radiusM]
  );

  const message = useMemo(() => {
    if (!home) return "집 위치를 설정해 주세요.";
    if (!pos) return "현재 위치를 확인 중이에요.";
    return insideHome
      ? "지금은 집 근처에 머물고 있어요."
      : "집을 벗어나 활동 중이에요.";
  }, [home, pos, insideHome]);

  const lastLabel = useMemo(() => {
    if (!lastFixAt) return "-";
    return new Date(lastFixAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastFixAt]);

  const goCoordGoals = useMemo(
    () => (goals || []).filter((g) => g?.coord && !g.done),
    [goals]
  );

  // 지오펜싱 제어
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (!home) {
          lastGeofenceSigRef.current = null;
          await stopHomeGeofence();
          return;
        }
        const targets = goCoordGoals
          .map((g) => ({
            id: String(g.id),
            lat: Number(g.coord.latitude),
            lon: Number(g.coord.longitude),
          }))
          .sort((a, b) => a.id.localeCompare(b.id));
        const sig = JSON.stringify({ home, goalRadiusM: 120, targets });
        if (sig === lastGeofenceSigRef.current) return;
        lastGeofenceSigRef.current = sig;
        await startHomeAndGoalsGeofence({
          home,
          goals: targets.map((t) => ({
            id: t.id,
            coord: { latitude: t.lat, longitude: t.lon },
          })),
          goalRadiusM: 120,
        });
      } catch {}
    };
    const t = setTimeout(() => {
      if (!cancelled) run();
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [home, goCoordGoals]);

  return (
    <View style={styles.container}>
      <GlassCard isDark={isDark} intensity={25}>
        <View style={styles.row}>
          <Text style={[styles.title, { color: theme.text }]}>실시간 위치</Text>
          <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              {insideHome ? "HOME" : "AWAY"}
            </Text>
          </View>
        </View>

        <Text style={[styles.msg, { color: theme.text }]}>{message}</Text>

        <View style={[styles.infoBox, { borderTopColor: theme.progressTrack }]}>
          <Text style={[styles.sub, { color: theme.subText }]}>
            업데이트: {lastLabel}
          </Text>
          {dist != null && (
            <Text style={[styles.distText, { color: theme.text }]}>
              집까지 약{" "}
              <Text style={[styles.highlight, { color: theme.primary }]}>
                {Math.max(0, Math.round(dist))}m
              </Text>
            </Text>
          )}
        </View>

        {pos && (
          <Text style={[styles.coordText, { color: theme.subText }]}>
            ({pos.latitude.toFixed(4)}, {pos.longitude.toFixed(4)})
          </Text>
        )}
      </GlassCard>
    </View>
  );
}

const lightTheme = {
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  badgeBg: "#F0F4FF",
  progressTrack: "rgba(0,0,0,0.05)",
};
const darkTheme = {
  text: "#FFF",
  subText: "rgba(255,255,255,0.3)",
  primary: "#A78BFA",
  badgeBg: "rgba(167, 139, 250, 0.15)",
  progressTrack: "rgba(255,255,255,0.05)",
};

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  glassWrapper: { borderRadius: 24, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  glassPadding: { padding: 20 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "800" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "900" },
  msg: { fontSize: 14, fontWeight: "700", marginBottom: 16 },
  infoBox: { borderTopWidth: 1, paddingTop: 12, gap: 4 },
  sub: { fontSize: 12, fontWeight: "600" },
  distText: { fontSize: 13, fontWeight: "700" },
  highlight: { fontWeight: "800" },
  coordText: {
    fontSize: 10,
    marginTop: 8,
    textAlign: "right",
    fontWeight: "500",
  },
});
