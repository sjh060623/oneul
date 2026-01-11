import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { startHomeGeofence } from "../geoBackground";

const GEOFENCE_ENABLED_KEY = "HOME_GEOFENCE_ENABLED_V1";
const HOME_KEY = "HOME_COORD_V1";

export default function GeoReset({ onHomeChanged }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const [perm, setPerm] = useState(null);
  const [home, setHome] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);

  async function enableGeofence() {
    const saved = await AsyncStorage.getItem(HOME_KEY);
    if (!saved) return;
    const homeCoord = JSON.parse(saved);
    await startHomeGeofence({
      latitude: homeCoord.latitude,
      longitude: homeCoord.longitude,
      radiusM: 80,
    });
  }

  const toggleSwitch = async () => {
    const next = !isEnabled;
    setIsEnabled(next);
    try {
      await AsyncStorage.setItem(GEOFENCE_ENABLED_KEY, next ? "1" : "0");
      if (next) await enableGeofence();
    } catch (e) {}
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const saved = await AsyncStorage.getItem(HOME_KEY);
        if (mounted) setHome(saved ? JSON.parse(saved) : null);

        const { status } = await Location.getForegroundPermissionsAsync();
        if (mounted) setPerm(status);

        const raw = await AsyncStorage.getItem(GEOFENCE_ENABLED_KEY);
        if (mounted) {
          setIsEnabled(raw === "1");
          if (raw === "1") await enableGeofence();
        }
      } catch (e) {}
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
      } catch (e) {}
    }, 1500);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [home]);

  const setHomeHere = async () => {
    const req = await Location.requestForegroundPermissionsAsync();
    if (req.status !== "granted") {
      Alert.alert("권한 필요", "위치 권한을 허용해 주세요.");
      return;
    }
    try {
      const cur = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        latitude: cur.coords.latitude,
        longitude: cur.coords.longitude,
      };
      await AsyncStorage.setItem(HOME_KEY, JSON.stringify(next));
      setHome(next);
      onHomeChanged?.(next);
      Alert.alert("설정 완료", "현재 위치를 소중한 집으로 저장했어요.");
    } catch (e) {
      Alert.alert("실패", "현재 위치를 가져오지 못했어요.");
    }
  };

  const clearHome = async () => {
    await AsyncStorage.removeItem(HOME_KEY);
    setHome(null);
    onHomeChanged?.(null);
    Alert.alert("초기화 완료", "집 위치 정보가 삭제되었어요.");
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.glassWrapper,
          isDark ? styles.darkBorder : styles.lightBorder,
        ]}
      >
        <BlurView
          intensity={isDark ? 20 : 40}
          tint={isDark ? "dark" : "light"}
          style={styles.padding}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleGroup}>
              <Text style={[styles.title, { color: theme.text }]}>
                집 위치 설정
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  {home ? "설정 완료" : "미설정"}
                </Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sub, { color: theme.subText }]}>
            {home
              ? "포근한 집 위치가 잘 저장되어 있어요."
              : "집 위치를 설정하고 자동 완료 기능을 사용해 보세요."}
          </Text>

          <View style={styles.btnRow}>
            <Pressable
              onPress={setHomeHere}
              style={[
                styles.btn,
                { backgroundColor: isDark ? "#FFF" : theme.primary },
              ]}
            >
              <Text
                style={[styles.btnText, { color: isDark ? "#000" : "#FFF" }]}
              >
                현재 위치를 집으로
              </Text>
            </Pressable>
            <Pressable
              onPress={clearHome}
              style={[
                styles.btnGhost,
                { backgroundColor: theme.progressTrack },
              ]}
            >
              <Text style={[styles.btnGhostText, { color: theme.subText }]}>
                초기화
              </Text>
            </Pressable>
          </View>

          {perm && perm !== "granted" && (
            <View
              style={[
                styles.warnBox,
                {
                  backgroundColor: isDark ? "rgba(255,107,107,0.1)" : "#FFF5F5",
                },
              ]}
            >
              <Text style={styles.warn}>
                ⚠️ 위치 권한이 꺼져 있어 원활한 작동이 어려워요.
              </Text>
            </View>
          )}

          <View
            style={[
              styles.switchContainer,
              { borderTopColor: theme.progressTrack },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>
                백그라운드 감지
              </Text>
              <Text style={[styles.switchSub, { color: theme.subText }]}>
                앱이 꺼져도 위치를 인식해요.
              </Text>
            </View>
            <Switch
              trackColor={{ false: theme.progressTrack, true: theme.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.progressTrack}
              onValueChange={toggleSwitch}
              value={isEnabled}
            />
          </View>
        </BlurView>
      </View>
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
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  badgeBg: "rgba(167, 139, 250, 0.15)",
  progressTrack: "rgba(255,255,255,0.1)",
};

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  glassWrapper: { borderRadius: 24, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  padding: { padding: 20 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 16, fontWeight: "800" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "900" },
  sub: { fontSize: 13, fontWeight: "600", lineHeight: 18, marginBottom: 16 },

  btnRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  btn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontWeight: "800", fontSize: 13 },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { fontWeight: "700", fontSize: 13 },

  warnBox: { padding: 12, borderRadius: 12, marginBottom: 16 },
  warn: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  switchLabel: { fontSize: 14, fontWeight: "700" },
  switchSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
});
