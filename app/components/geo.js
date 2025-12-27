import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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

export default function Home({ radiusM = 80 }) {
  const { goals, toggleGoal, removeGoal } = useGoals();

  const [home, setHome] = useState(null);
  const homePollRef = useRef(null);
  const lastHomeRawRef = useRef(null);
  const lastGeofenceSigRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const loadHome = async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (!mounted) return;

        if (saved === lastHomeRawRef.current) return;
        lastHomeRawRef.current = saved;

        const next = saved ? JSON.parse(saved) : null;

        if (next?.latitude && next?.longitude) setHome(next);
        else setHome(null);
      } catch {
        if (mounted) {
          lastHomeRawRef.current = null;
          setHome(null);
        }
      }
    };

    loadHome();

    homePollRef.current = setInterval(loadHome, 1500);

    return () => {
      mounted = false;
      try {
        if (homePollRef.current) clearInterval(homePollRef.current);
      } catch {}
    };
  }, []);

  const [pos, setPos] = useState(null);
  const [lastFixAt, setLastFixAt] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;
      if (status !== "granted") return;

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
        } catch {
          // ignore
        }
      };

      await pull();
      pollRef.current = setInterval(pull, 5000);
    };

    boot();

    return () => {
      mounted = false;
      try {
        if (pollRef.current) clearInterval(pollRef.current);
      } catch {}
    };
  }, []);

  const dist = useMemo(() => {
    if (!home || !pos) return null;
    return distanceMeters(home, pos);
  }, [home, pos]);

  const insideHome = useMemo(() => {
    if (dist == null) return null;
    return dist <= radiusM;
  }, [dist, radiusM]);

  const message = useMemo(() => {
    if (!home) return "집 위치를 설정해 주세요.";
    if (!pos) return "현재 위치 확인 중…";
    if (insideHome == null) return "현재 위치 확인 중…";
    return insideHome ? "집 근처에 있어요." : "집을 벗어나 있는 상태예요.";
  }, [home, pos, insideHome]);

  const lastLabel = useMemo(() => {
    if (!lastFixAt) return "-";
    return new Date(lastFixAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastFixAt]);

  const goCoordGoals = useMemo(() => {
    return (goals || []).filter((g) => g?.coord && !g.done);
  }, [goals]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (!home) {
          lastGeofenceSigRef.current = null;
          await stopHomeGeofence();
          return;
        }

        const targets = (goCoordGoals || [])
          .map((g) => ({
            id: String(g.id),
            lat: Number(g?.coord?.latitude),
            lon: Number(g?.coord?.longitude),
          }))
          .filter(
            (t) => t.id && Number.isFinite(t.lat) && Number.isFinite(t.lon)
          )
          .sort((a, b) => a.id.localeCompare(b.id));

        const sig = JSON.stringify({
          home: { lat: Number(home.latitude), lon: Number(home.longitude) },
          goalRadiusM: 120,
          targets,
        });

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
      } catch {
        // ignore
      }
    };

    const t = setTimeout(() => {
      if (!cancelled) run();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [home, goCoordGoals]);

  const goGoalsWithDistance = useMemo(() => {
    return goCoordGoals
      .map((g) => {
        if (!pos) return { ...g, meters: null };
        const c = g.coord;
        if (!c) return { ...g, meters: null };

        const meters = distanceMeters(
          { latitude: c.latitude, longitude: c.longitude },
          pos
        );

        return { ...g, meters: Number.isFinite(meters) ? meters : null };
      })
      .sort((a, b) => {
        const am = a.meters == null ? Number.POSITIVE_INFINITY : a.meters;
        const bm = b.meters == null ? Number.POSITIVE_INFINITY : b.meters;
        return am - bm;
      });
  }, [goCoordGoals, pos]);

  return (
    <View style={styles.container}>
      <View style={styles.wrap}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>위치</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{radiusM}m</Text>
            </View>
          </View>

          <Text style={styles.msg} numberOfLines={2}>
            {message}
          </Text>

          <Text style={styles.sub}>
            업데이트: {lastLabel}
            {pos
              ? `  ·  (${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)})`
              : ""}
          </Text>

          {dist != null ? (
            <Text style={styles.sub}>
              집까지 약 {Math.max(0, Math.round(dist))}m
            </Text>
          ) : (
            <Text style={styles.sub}>
              집/현재 위치가 준비되면 거리 표시가 나와요.
            </Text>
          )}
        </View>
      </View>

      {goGoalsWithDistance.map((g) => (
        <View key={g.id} style={styles.goalItem}>
          <Text style={styles.goalText}>{g.text}</Text>
          <Text style={styles.coordText} numberOfLines={1}>
            {g.coord.latitude.toFixed(6)}, {g.coord.longitude.toFixed(6)}
          </Text>
          <Text style={styles.distText} numberOfLines={1}>
            거리:{" "}
            {g.meters == null ? "-" : `${Math.max(0, Math.round(g.meters))}m`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sectionHint: {
    fontSize: 12,
    color: "#6f7377",
    marginBottom: 12,
  },
  goalItem: {
    marginBottom: 12,
  },
  goalText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  coordText: {
    color: "#6f7377",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  distText: {
    color: "#6f7377",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "800",
  },
  wrap: { marginTop: 12 },
  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "800" },
  badge: {
    backgroundColor: "#1f1f1f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  msg: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sub: { color: "#6f7377", fontSize: 12, marginTop: 6, fontWeight: "700" },
});
