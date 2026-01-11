import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useGoals } from "../src/goalsStore";

const MAP_STYLE_DARK = [
  { elementType: "geometry", stylers: [{ color: "#16161D" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#718096" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1c2c" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2D3748" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0D0B14" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

const MAP_STYLE_LIGHT = [
  { elementType: "geometry", stylers: [{ color: "#F8F9FF" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#DCE6FF" }],
  },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function HomeMap({ height = 420 }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = isDark ? darkStyles : lightStyles;

  const { goals } = useGoals();
  const mapRef = useRef(null);
  const pullRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [perm, setPerm] = useState("unknown");
  const [lastFixAt, setLastFixAt] = useState(null);
  const [drag, setDrag] = useState(false);

  const goalPins = useMemo(() => {
    return (goals || [])
      .filter((g) => g?.coord && !g.done)
      .map((g) => {
        const lat = Number(g.coord.latitude);
        const lon = Number(g.coord.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
          id: String(g.id),
          title: String(g.text || "목표"),
          coordinate: { latitude: lat, longitude: lon },
        };
      })
      .filter(Boolean)
      .slice(0, 30);
  }, [goals]);

  const allCoords = useMemo(() => {
    const arr = [];
    if (pos) arr.push(pos);
    goalPins.forEach((p) => arr.push(p.coordinate));
    return arr;
  }, [pos, goalPins]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const res = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (res.status !== "granted") {
          setPerm("denied");
          return;
        }
        setPerm("granted");
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
        pullRef.current = pull;
        await pull();
      } catch {
        if (mounted) setPerm("denied");
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!pullRef.current) return;
    const intervalMs = drag ? 100000 : 5000;
    const id = setInterval(() => {
      try {
        pullRef.current?.();
      } catch {}
    }, intervalMs);
    return () => clearInterval(id);
  }, [drag]);

  useEffect(() => {
    if (!mapRef.current || !allCoords.length || drag) return;
    const id = setTimeout(() => {
      try {
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      } catch {}
    }, 5000);
    return () => clearTimeout(id);
  }, [allCoords, drag]);

  const lastLabel = useMemo(() => {
    if (!lastFixAt) return "-";
    return new Date(lastFixAt).toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastFixAt]);

  const centerOnMe = async () => {
    try {
      if (perm !== "granted") return;
      const cur = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const p = {
        latitude: cur.coords.latitude,
        longitude: cur.coords.longitude,
      };
      setPos(p);
      setLastFixAt(Date.now());
      mapRef.current?.animateToRegion(
        { ...p, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        350
      );
    } catch {}
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>실시간 지도</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>업데이트: {lastLabel}</Text>
          <Text style={styles.meta}>목표 {goalPins.length}곳</Text>
        </View>
      </View>

      {perm === "denied" ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>위치 정보가 필요해요</Text>
          <Text style={styles.fallbackSub}>
            지도 위에 당신의 발자국을 남겨보세요.
          </Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            onPanDrag={() => setDrag(true)}
            onRegionChangeComplete={() => setDrag(false)}
            customMapStyle={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
            showsUserLocation={false}
            loadingEnabled
            rotateEnabled={false}
            pitchEnabled={false}
          >
            {pos && (
              <Marker coordinate={pos} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.meDotContainer}>
                  <View style={styles.meDotHalo} />
                  <View style={styles.meDot} />
                </View>
              </Marker>
            )}

            {goalPins.map((p) => (
              <Marker
                key={p.id}
                coordinate={p.coordinate}
                title={p.title}
                pinColor={isDark ? "#A78BFA" : "#6366F1"}
              />
            ))}
          </MapView>

          <Pressable onPress={centerOnMe} style={styles.fab}>
            <Text style={styles.fabText}>내 위치</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const lightStyles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: { color: "#2D3748", fontSize: 15, fontWeight: "800" },
  metaRow: { marginTop: 4, flexDirection: "row", gap: 10 },
  meta: { color: "#A0AEC0", fontSize: 11, fontWeight: "600" },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  meDotContainer: { alignItems: "center", justifyContent: "center" },
  meDotHalo: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(99, 102, 241, 0.2)",
  },
  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#6366F1",
    borderWidth: 3,
    borderColor: "#fff",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#F8F9FF",
  },
  fallbackTitle: { color: "#2D3748", fontSize: 15, fontWeight: "800" },
  fallbackSub: {
    marginTop: 8,
    color: "#A0AEC0",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});

const darkStyles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  title: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  metaRow: { marginTop: 4, flexDirection: "row", gap: 10 },
  meta: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: "600" },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  meDotContainer: { alignItems: "center", justifyContent: "center" },
  meDotHalo: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(167, 139, 250, 0.3)",
  },
  meDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#A78BFA",
    borderWidth: 3,
    borderColor: "#0D0B14",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#000", fontSize: 12, fontWeight: "800" },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#0D0B14",
  },
  fallbackTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  fallbackSub: {
    marginTop: 8,
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
