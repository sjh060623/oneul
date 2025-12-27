import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { startHomeGeofence } from "../geoBackground";

const HOME_KEY = "HOME_COORD_V1";

export default function GeoReset({ radiusM = 80, setRadiusM, onHomeChanged }) {
  const [perm, setPerm] = useState(null);
  const [home, setHome] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  async function enableGeofence() {
    const saved = await AsyncStorage.getItem(HOME_KEY);
    if (!saved) {
      Alert.alert("집 위치 없음", "집을 먼저 설정하세요.");
      return;
    }

    const home = JSON.parse(saved);

    await startHomeGeofence({
      latitude: home.latitude,
      longitude: home.longitude,
      radiusM: 80,
    });

    Alert.alert("켜짐", "앱 종료 후에도 알림이 와요.");
  }
  async function disableGeofence() {
    const saved = await AsyncStorage.getItem(HOME_KEY);
    if (!saved) {
      Alert.alert("집 위치 없음", "집을 먼저 설정하세요.");
      return;
    }

    Alert.alert("꺼짐", "앱 종료 후엔 알림이 꺼져요.");
  }
  const toggleSwitch = () => {
    setIsEnabled((previousState) => !previousState);
    if (isEnabled == false) {
      enableGeofence();
    } else {
      disableGeofence();
    }
  };

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (!mounted) return;
        setHome(saved ? JSON.parse(saved) : null);
      } catch (e) {
        // ignore
      }

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (!mounted) return;
        setPerm(status);
      } catch (e) {
        // ignore
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const id = setInterval(async () => {
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

        if (!same) setHome(next);
      } catch (e) {
        // ignore
      }
    }, 1500);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [home]);

  const requestPermIfNeeded = async () => {
    const cur = await Location.getForegroundPermissionsAsync();
    if (cur.status === "granted") {
      setPerm("granted");
      return true;
    }
    const req = await Location.requestForegroundPermissionsAsync();
    setPerm(req.status);
    return req.status === "granted";
  };

  const setHomeHere = async () => {
    const ok = await requestPermIfNeeded();
    if (!ok) {
      Alert.alert("권한 필요", "위치 권한을 허용해 주세요.");
      return;
    }

    let cur;
    try {
      cur = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (e) {
      Alert.alert("실패", "현재 위치를 가져오지 못했어요.");
      return;
    }

    const next = {
      latitude: cur.coords.latitude,
      longitude: cur.coords.longitude,
    };

    await AsyncStorage.setItem(HOME_KEY, JSON.stringify(next));
    setHome(next);
    onHomeChanged?.(next);
    Alert.alert("집 위치 저장", "현재 위치를 집으로 저장했어요.");
  };

  const clearHome = async () => {
    await AsyncStorage.removeItem(HOME_KEY);
    setHome(null);
    onHomeChanged?.(null);
    Alert.alert("집 초기화", "집 위치를 초기화했어요.");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>집 설정</Text>
          {/**
           * 
           *    <View style={styles.badge}>
            <Text style={styles.badgeText}>{radiusM}m</Text>
          </View>
           */}
        </View>

        <Text style={styles.sub} numberOfLines={2}>
          {home
            ? "집 위치가 저장돼 있어요."
            : "집 위치가 없어요. 아래 버튼으로 설정하세요."}
        </Text>

        <View style={styles.btnRow}>
          <Pressable
            onPress={setHomeHere}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>현재 위치를 집으로</Text>
          </Pressable>

          <Pressable onPress={clearHome} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>집 초기화</Text>
          </Pressable>
        </View>

        {perm && perm !== "granted" ? (
          <Text style={styles.warn}>
            위치 권한이 꺼져 있어요. 설정에서 허용해 주세요.
          </Text>
        ) : null}
        <View style={styles.c}>
          <Text style={styles.l}>앱 종료 후 알림</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#34C759" }} // iOS 기본 초록색(#34C759)
            thumbColor={
              Platform.OS === "ios"
                ? undefined
                : isEnabled
                ? "#f4f3f4"
                : "#f4f3f4"
            }
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    borderColor: "#1f1f1f",
  },
  headerRow: {
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
  sub: { color: "#6f7377", fontSize: 12 },
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
  radiusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
  },
  radiusLabel: { color: "#9aa0a6", fontSize: 12, fontWeight: "800" },
  radiusBtns: { flexDirection: "row", gap: 8 },
  radiusBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  radiusBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  disabledBtn: { opacity: 0.5 },
  warn: { color: "#ff9f0a", fontSize: 12, marginTop: 10, fontWeight: "700" },
  c: {
    flexDirection: "row", // 텍스트와 스위치를 가로로 배치
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 18,
  },
  l: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
});
