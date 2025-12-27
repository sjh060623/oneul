import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

const HOME_KEY = "HOME_COORD_V1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

async function ensureNotifPerm() {
  try {
    const perm = await Notifications.getPermissionsAsync();
    const granted =
      perm.granted ||
      perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (granted) return true;

    const req = await Notifications.requestPermissionsAsync();
    return (
      req.granted ||
      req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
}

export default function GeoStatus({ radiusM = 80 }) {
  const [perm, setPerm] = useState(null);
  const [home, setHome] = useState(null);
  const [pos, setPos] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [message, setMessage] = useState("집 위치를 설정해 주세요.");

  const watchRef = useRef(null);
  const pollRef = useRef(null);
  const homePollRef = useRef(null);

  const wasInsideRef = useRef(null);
  const lastTriggerAtRef = useRef(0);

  const canMeasure = !!home && !!pos;

  const dist = useMemo(() => {
    if (!canMeasure) return null;
    return distanceMeters(home, pos);
  }, [canMeasure, home, pos, lastUpdated]);

  const inside = useMemo(() => {
    if (dist == null) return null;
    return dist <= radiusM;
  }, [dist, radiusM]);

  const pushNow = async (title, body) => {
    const ok = await ensureNotifPerm();
    if (!ok) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body },
        trigger: null,
      });
    } catch {}
  };

  const updatePos = (latitude, longitude) => {
    setPos({ latitude, longitude });
    setLastUpdated(Date.now());
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (saved && mounted) {
          const parsed = JSON.parse(saved);
          if (parsed?.latitude && parsed?.longitude) setHome(parsed);
        }
      } catch {}

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      setPerm(status);

      if (status !== "granted") {
        setMessage("위치 권한이 필요해요. 설정에서 허용해 주세요.");
        return;
      }

      try {
        const cur = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!mounted) return;
        updatePos(cur.coords.latitude, cur.coords.longitude);
      } catch {}

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // 요청 간격
          distanceInterval: 1,
        },
        (l) => {
          if (!mounted) return;
          updatePos(l.coords.latitude, l.coords.longitude);
        }
      );

      pollRef.current = setInterval(async () => {
        if (!mounted) return;
        try {
          const cur = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          updatePos(cur.coords.latitude, cur.coords.longitude);
        } catch {}
      }, 5000);
    };

    boot();

    return () => {
      mounted = false;
      try {
        watchRef.current?.remove?.();
      } catch {}
      if (pollRef.current) clearInterval(pollRef.current);
      if (homePollRef.current) clearInterval(homePollRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    homePollRef.current = setInterval(async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (!mounted) return;
        const next = saved ? JSON.parse(saved) : null;

        const same =
          (!!home &&
            !!next &&
            home.latitude === next.latitude &&
            home.longitude === next.longitude) ||
          (!home && !next);

        if (!same) {
          setHome(next);
          wasInsideRef.current = null;
          setLastUpdated(Date.now());
        }
      } catch {}
    }, 800);

    return () => {
      mounted = false;
    };
  }, [home]);

  useEffect(() => {
    if (!home) {
      if (perm === "granted") setMessage("프로필에서 집 위치를 설정해 주세요.");
      return;
    }
    if (!pos) {
      setMessage("현재 위치 확인 중…");
      return;
    }
    if (inside == null) return;

    const now = Date.now();
    const wasInside = wasInsideRef.current;

    if (wasInside === null) {
      wasInsideRef.current = inside;
      setMessage(inside ? "집 근처에 있어요." : "집을 벗어나 있는 상태예요.");
      return;
    }

    const cooldownOk = now - lastTriggerAtRef.current > 5000;

    if (cooldownOk && wasInside === true && inside === false) {
      lastTriggerAtRef.current = now;
      setMessage("힘차게 출발했네요!");
    } else if (cooldownOk && wasInside === false && inside === true) {
      lastTriggerAtRef.current = now;
      setMessage("집 근처에 도착했어요!");
    } else {
      setMessage(inside ? "집 근처에 있어요." : "집을 벗어나 있는 상태예요.");
    }

    wasInsideRef.current = inside;
  }, [home, pos, inside, perm, lastUpdated]);

  const setHomeHere = async () => {
    if (perm !== "granted") {
      Alert.alert("권한 필요", "위치 권한을 먼저 허용해 주세요.");
      return;
    }
    if (!pos) {
      Alert.alert("잠시만", "현재 위치를 아직 못 가져왔어요.");
      return;
    }

    const next = { latitude: pos.latitude, longitude: pos.longitude };
    setHome(next);
    wasInsideRef.current = null;
    await AsyncStorage.setItem(HOME_KEY, JSON.stringify(next));
    setLastUpdated(Date.now());
    Alert.alert("집 위치 저장", "현재 위치를 집으로 저장했어요.");
  };

  const clearHome = async () => {
    setHome(null);
    wasInsideRef.current = null;
    await AsyncStorage.removeItem(HOME_KEY);
    setLastUpdated(Date.now());
  };

  const lastLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : "-";

  return (
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
  );
}

const styles = StyleSheet.create({
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
  sub: { color: "#6f7377", fontSize: 12, marginTop: 6 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#fff" },
  btnPrimaryText: { color: "#000", fontWeight: "900", fontSize: 12 },
  btnGhost: { backgroundColor: "#111", borderWidth: 1, borderColor: "#2a2a2a" },
  btnGhostText: { color: "#fff", fontWeight: "900", fontSize: 12 },
});
