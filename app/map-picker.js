import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { router } from "expo-router";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const PICK_KEY = "PICKED_PLACE_V1";

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

export default function MapPicker() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const mapRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [picked, setPicked] = useState(null);

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      if (status !== "granted") {
        Alert.alert(
          "권한 필요",
          "지도에서 위치를 고르려면 위치 권한이 필요해요."
        );
        return;
      }

      const cur = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!mounted) return;

      setRegion({
        latitude: cur.coords.latitude,
        longitude: cur.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();

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
      motionSub.remove();
    };
  }, []);

  const onMapPress = (e) => {
    const c = e?.nativeEvent?.coordinate;
    if (!c) return;
    setPicked({ latitude: c.latitude, longitude: c.longitude });
  };

  const onSave = async () => {
    if (!picked) {
      Alert.alert("선택 필요", "지도를 한 번 눌러서 위치를 선택해 주세요.");
      return;
    }
    await AsyncStorage.setItem(PICK_KEY, JSON.stringify(picked));
    router.back();
  };

  const centerOnMe = async () => {
    const cur = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    mapRef.current?.animateToRegion(
      {
        latitude: cur.coords.latitude,
        longitude: cur.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      400
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* 배경 Glow 효과 */}
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

      {/* 헤더 (Floating Glass) */}
      <SafeAreaView style={styles.headerOverlay} edges={["top"]}>
        <View
          style={[
            styles.glassHeader,
            isDark ? styles.darkBorder : styles.lightBorder,
          ]}
        >
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={styles.headerPadding}
          >
            <Pressable
              onPress={() => router.back()}
              style={[styles.backBtn, { backgroundColor: theme.progressTrack }]}
            >
              <Text style={{ color: theme.text, fontWeight: "700" }}>닫기</Text>
            </Pressable>

            <View style={styles.headerTitleGroup}>
              <Text style={[styles.title, { color: theme.text }]}>
                위치 선택
              </Text>
              <Text
                style={[styles.sub, { color: theme.subText }]}
                numberOfLines={1}
              >
                {picked
                  ? `${picked.latitude.toFixed(4)}, ${picked.longitude.toFixed(
                      4
                    )}`
                  : "지도를 탭하여 핀을 꽂으세요"}
              </Text>
            </View>

            <Pressable
              onPress={onSave}
              style={[
                styles.saveBtn,
                { backgroundColor: isDark ? "#FFF" : theme.primary },
              ]}
            >
              <Text
                style={[
                  styles.saveBtnText,
                  { color: isDark ? "#000" : "#FFF" },
                ]}
              >
                저장
              </Text>
            </Pressable>
          </BlurView>
        </View>
      </SafeAreaView>

      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onPress={onMapPress}
            showsUserLocation
            customMapStyle={isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
          >
            {picked && (
              <Marker coordinate={picked}>
                <View style={styles.markerContainer}>
                  <View
                    style={[
                      styles.markerHalo,
                      { backgroundColor: theme.primary + "33" },
                    ]}
                  />
                  <View
                    style={[
                      styles.markerDot,
                      {
                        backgroundColor: theme.primary,
                        borderColor: isDark ? "#16161D" : "#FFF",
                      },
                    ]}
                  />
                </View>
              </Marker>
            )}
          </MapView>
        ) : (
          <View style={styles.loading}>
            <Text style={[styles.loadingText, { color: theme.subText }]}>
              지도를 불러오는 중이에요...
            </Text>
          </View>
        )}
      </View>

      {/* 푸터 및 FAB */}
      <View style={styles.bottomOverlay}>
        <Pressable
          onPress={centerOnMe}
          style={[
            styles.fab,
            { backgroundColor: isDark ? "#FFF" : theme.primary },
          ]}
        >
          <Text style={[styles.fabText, { color: isDark ? "#000" : "#FFF" }]}>
            내 위치
          </Text>
        </Pressable>

        <View
          style={[
            styles.glassFooter,
            isDark ? styles.darkBorder : styles.lightBorder,
          ]}
        >
          <BlurView
            intensity={isDark ? 40 : 60}
            tint={isDark ? "dark" : "light"}
            style={styles.footerPadding}
          >
            <Text style={[styles.footerText, { color: theme.subText }]}>
              지도를 탭해서 핀을 꽂은 뒤 저장 버튼을 누르세요.
            </Text>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const lightTheme = {
  background: "#F0F2F9",
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  progressTrack: "rgba(0,0,0,0.05)",
  glowColor: "rgba(129, 140, 248, 0.15)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  progressTrack: "rgba(255,255,255,0.1)",
  glowColor: "rgba(167, 139, 250, 0.2)",
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: -1,
  },
  glowCircle: {
    position: "absolute",
    top: "20%",
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },

  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  glassHeader: { borderRadius: 24, overflow: "hidden", borderWidth: 1 },
  headerPadding: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  headerTitleGroup: { flex: 1 },
  title: { fontSize: 16, fontWeight: "800" },
  sub: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveBtnText: { fontSize: 13, fontWeight: "900" },

  mapContainer: { flex: 1 },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 15, fontWeight: "700" },

  markerContainer: { alignItems: "center", justifyContent: "center" },
  markerHalo: { position: "absolute", width: 30, height: 30, borderRadius: 15 },
  markerDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3 },

  bottomOverlay: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    zIndex: 10,
    alignItems: "flex-end",
    gap: 16,
  },
  fab: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  fabText: { fontSize: 13, fontWeight: "800" },

  glassFooter: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  footerPadding: { paddingVertical: 12, paddingHorizontal: 16 },
  footerText: { fontSize: 12, fontWeight: "600", textAlign: "center" },

  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
});
