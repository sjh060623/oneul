import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

const PICK_KEY = "PICKED_PLACE_V1";

export default function MapPicker() {
  const [region, setRegion] = useState(null);
  const [picked, setPicked] = useState(null);

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

    return () => {
      mounted = false;
    };
  }, []);

  const onMapPress = (e) => {
    const c = e?.nativeEvent?.coordinate;
    if (!c) return;
    setPicked({ latitude: c.latitude, longitude: c.longitude });
  };

  const coordLabel = useMemo(() => {
    if (!picked) return "";
    return `${picked.latitude.toFixed(6)}, ${picked.longitude.toFixed(6)}`;
  }, [picked]);

  const onSave = async () => {
    if (!picked) {
      Alert.alert("선택 필요", "지도를 한 번 눌러서 위치를 선택하세요.");
      return;
    }
    await AsyncStorage.setItem(PICK_KEY, JSON.stringify(picked));
    router.back();
  };

  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;

    (async () => {
      try {
        const v = await AsyncStorage.getItem(PICK_KEY);
        if (!v) return;
        const c = JSON.parse(v);
        if (!c?.latitude || !c?.longitude) return;

        const lat = Number(c.latitude).toFixed(6);
        const lng = Number(c.longitude).toFixed(6);
        setPlace(`${lat}, ${lng}`);
        await AsyncStorage.removeItem(PICK_KEY);
      } catch {
        // ignore
      }
    })();
  }, [isFocused]);
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>닫기</Text>
        </Pressable>

        <View style={styles.headerMid}>
          <Text style={styles.title}>지도에서 위치 선택</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {picked ? coordLabel : "지도를 탭해서 위치를 고르세요"}
          </Text>
        </View>

        <Pressable onPress={onSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>저장</Text>
        </Pressable>
      </View>

      {region ? (
        <MapView
          style={styles.map}
          initialRegion={region}
          onPress={onMapPress}
          showsUserLocation
        >
          {picked ? <Marker coordinate={picked} /> : null}
        </MapView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>지도 준비 중…</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>탭 → 핀 → 저장</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0b0b0b" },
  header: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  headerMid: { flex: 1 },
  title: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sub: { color: "#6f7377", fontSize: 12, marginTop: 2 },
  saveBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#000", fontSize: 12, fontWeight: "900" },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#fff", fontWeight: "800" },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
    backgroundColor: "#0b0b0b",
  },
  footerText: { color: "#6f7377", fontSize: 12 },
});
