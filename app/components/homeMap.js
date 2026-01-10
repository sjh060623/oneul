import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useGoals } from "../src/goalsStore";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function HomeMap({ height = 420 }) {
  const { goals } = useGoals();
  const mapRef = useRef(null);
  const pullRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [perm, setPerm] = useState("unknown");
  const [lastFixAt, setLastFixAt] = useState(null);
  const [drag, setDrag] = useState(false);
  const goalPins = useMemo(() => {
    const list = (goals || [])
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
      .filter(Boolean);

    return list.slice(0, 30);
  }, [goals]);

  const allCoords = useMemo(() => {
    const arr = [];
    if (pos) arr.push(pos);
    for (const p of goalPins) arr.push(p.coordinate);
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
    if (!mapRef.current) return;
    if (!allCoords.length) return;
    if (drag) return;

    const id = setTimeout(() => {
      try {
        mapRef.current.fitToCoordinates(allCoords, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      } catch {}
    }, 5000);

    return () => clearTimeout(id);
  }, [allCoords, drag]);

  const initialRegion = useMemo(() => {
    const base = pos || { latitude: 37.5665, longitude: 126.978 };
    const spread = clamp(goalPins.length, 0, 10);
    const delta = 0.01 + spread * 0.004;
    return {
      latitude: base.latitude,
      longitude: base.longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
  }, [pos, goalPins.length]);

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
        {
          latitude: p.latitude,
          longitude: p.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        350
      );
    } catch {}
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>지도</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{`업데이트: ${lastLabel}`}</Text>
          <Text style={styles.meta}>{`목표 ${goalPins.length}`}</Text>
        </View>
      </View>

      {perm === "denied" ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackTitle}>위치 권한이 필요해요</Text>
          <Text style={styles.fallbackSub}>
            설정에서 위치 권한을 허용하면 현재 위치를 표시할 수 있어요.
          </Text>
        </View>
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            onPanDrag={() => setDrag(true)}
            onRegionChangeComplete={() => setDrag(false)}
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            loadingEnabled
            toolbarEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            mapType={Platform.OS === "ios" ? "standard" : "standard"}
          >
            {pos && (
              <Marker coordinate={pos} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.meDot} />
              </Marker>
            )}
            {pos ? (
              <Marker
                identifier="me"
                coordinate={pos}
                title="현재 위치"
                pinColor="#FFFFFF"
              />
            ) : null}

            {goalPins.map((p) => (
              <Marker
                key={p.id}
                identifier={`goal:${p.id}`}
                coordinate={p.coordinate}
                title={p.title}
                description="목표 위치"
                pinColor="#3B82F6"
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

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    backgroundColor: "#121212",
    overflow: "hidden",
  },
  meDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: "#0091ff",
    borderWidth: 3,
    borderColor: "#fff",
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },
  title: { color: "#fff", fontSize: 14, fontWeight: "900" },
  metaRow: { marginTop: 6, flexDirection: "row", gap: 10 },
  meta: { color: "#6f7377", fontSize: 12, fontWeight: "800" },

  mapWrap: { flex: 1 },
  map: { flex: 1 },

  fab: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  fallbackTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  fallbackSub: {
    marginTop: 8,
    color: "#6f7377",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
});
