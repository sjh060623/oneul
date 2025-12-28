import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GeoReset from "../components/goeReset";

const PROFILE_KEY = "PROFILE_V1"; // { name, photoUri }

export default function Profile() {
  const [profile, setProfile] = useState({ name: "", photoUri: "" });
  const [open, setOpen] = useState(false);

  // modal edit state
  const [draftName, setDraftName] = useState("");
  const [draftPhoto, setDraftPhoto] = useState("");

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (!mounted) return;
        const parsed = raw ? JSON.parse(raw) : null;
        const name = String(parsed?.name || "");
        const photoUri = String(parsed?.photoUri || "");
        setProfile({ name, photoUri });
      } catch {
        if (mounted) setProfile({ name: "", photoUri: "" });
      }
    };

    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const t = String(profile.name || "").trim();
    return t || "이름이 없어요.";
  }, [profile.name]);

  const openEdit = () => {
    setDraftName(profile.name || "");
    setDraftPhoto(profile.photoUri || "");
    setOpen(true);
  };

  const closeEdit = () => setOpen(false);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) setDraftPhoto(uri);
    } catch {}
  };

  const save = async () => {
    const next = {
      name: String(draftName || "").trim(),
      photoUri: String(draftPhoto || ""),
    };

    setProfile(next);
    setOpen(false);

    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {}
  };

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>프로필</Text>

        {/* 프로필 카드 */}
        <View style={styles.card}>
          <View style={styles.rowTop}>
            <View style={styles.avatarWrap}>
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPh}>
                  <Text style={styles.avatarPhText}>?</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.sub}>
                이름/사진을 설정해두면 기록에서 더 예쁘게 보여요.
              </Text>
            </View>
          </View>

          <Pressable onPress={openEdit} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>이름/사진 수정</Text>
          </Pressable>
        </View>

        <GeoReset />
      </View>

      {/* 편집 모달 */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalBack}>
          <Pressable style={styles.modalBackTap} onPress={closeEdit} />
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>프로필 수정</Text>
              <Pressable onPress={closeEdit} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>닫기</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>이름</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="이름이 뭔가요?"
              placeholderTextColor="#666"
              style={styles.input}
            />

            <Text style={styles.label}>사진</Text>
            <View style={styles.photoRow}>
              <Pressable onPress={pickPhoto} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>사진 선택</Text>
              </Pressable>
              <Pressable
                onPress={() => setDraftPhoto("")}
                style={styles.btnGhost}
              >
                <Text style={styles.btnGhostText}>사진 지우기</Text>
              </Pressable>
            </View>

            {draftPhoto ? (
              <Image source={{ uri: draftPhoto }} style={styles.preview} />
            ) : null}

            <Pressable onPress={save} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  container: { flex: 1 },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    marginBottom: 12,
  },
  rowTop: { flexDirection: "row", alignItems: "center" },

  avatarWrap: { width: 56, height: 56, borderRadius: 18, overflow: "hidden" },
  avatar: { width: 56, height: 56 },
  avatarPh: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPhText: { color: "#fff", fontSize: 18, fontWeight: "900" },

  name: { color: "#fff", fontSize: 16, fontWeight: "900" },
  sub: { color: "#6f7377", fontSize: 12, fontWeight: "800", marginTop: 6 },

  primaryBtn: {
    marginTop: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#000", fontSize: 13, fontWeight: "900" },

  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalBackTap: { flex: 1 },
  sheet: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    padding: 16,
  },
  sheetTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  sheetClose: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  label: { color: "#9aa0a6", fontSize: 12, fontWeight: "900", marginTop: 12 },
  input: {
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#fff",
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "800",
  },

  photoRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  btnGhost: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  preview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: "#111",
  },

  saveBtn: {
    marginTop: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#000", fontSize: 13, fontWeight: "900" },
});
