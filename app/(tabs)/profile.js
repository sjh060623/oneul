// app/(tabs)/profile.js
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GeoReset from "../components/goeReset";

export default function Profile() {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>프로필</Text>
        <Text style={styles.subtitle}>프로필 기능이 곧 추가될 예정입니다</Text>
      </View>
      <GeoReset />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: "#666",
    fontSize: 14,
  },
});
