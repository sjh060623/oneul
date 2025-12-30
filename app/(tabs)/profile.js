import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DailyTimeSetting from "../components/DailyTimeSetting";
import GeoReset from "../components/goeReset";

const PROFILE_KEY = "PROFILE_V1";

export default function Profile() {
  const [profile, setProfile] = useState({ name: "", photoUri: "" });
  const [open, setOpen] = useState(false);

  // 모달 편집 상태
  const [draftName, setDraftName] = useState("");
  const [draftPhoto, setDraftPhoto] = useState("");

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (!mounted) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          setProfile({
            name: String(parsed?.name || ""),
            photoUri: String(parsed?.photoUri || ""),
          });
        }
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
    return profile.name.trim() || "이름을 설정해주세요";
  }, [profile.name]);

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftPhoto(profile.photoUri);
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
      if (!res.canceled && res.assets?.[0]?.uri) {
        setDraftPhoto(res.assets[0].uri);
      }
    } catch {}
  };

  const save = async () => {
    const next = {
      name: draftName.trim(),
      photoUri: draftPhoto,
    };
    setProfile(next);
    setOpen(false);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {}
  };

  const replayTutorial = async () => {
    Alert.alert(
      "튜토리얼 재설정",
      "앱을 다시 시작할 때 가이드 화면이 나타나도록 설정할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          onPress: async () => {
            try {
              // 💡 튜토리얼 플래그 삭제
              await AsyncStorage.removeItem("APP_HAS_LAUNCHED_V1");
              Alert.alert(
                "설정 완료",
                "앱을 완전히 종료 후 다시 열면 튜토리얼이 나타납니다."
              );
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.title}>설정</Text>

          {/* 메인 프로필 카드 */}
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <View style={styles.avatarContainer}>
                {profile.photoUri ? (
                  <Image
                    source={{ uri: profile.photoUri }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarPlaceholderText}>👤</Text>
                  </View>
                )}
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.nameText}>{displayName}</Text>
                <Text style={styles.subText}>오늘 하루도 힘차게!</Text>
              </View>
            </View>

            <Pressable onPress={openEdit} style={styles.editBtn}>
              <Text style={styles.editBtnText}>프로필 수정하기</Text>
            </Pressable>
          </View>

          {/* 설정 */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>알림 설정</Text>
            <DailyTimeSetting />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>집 관리</Text>
            <GeoReset />
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionLabel}>튜토리얼</Text>
            </View>
            <Pressable onPress={replayTutorial} style={styles.menuItem}>
              <View style={styles.menuIconBox}>
                <Text style={{ fontSize: 14 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>튜토리얼 다시보기</Text>
                <Text style={styles.menuSub}>
                  앱 사용법 가이드를 다시 확인합니다.
                </Text>
              </View>
              <Text style={styles.menuArrow}>〉</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* 프로필 수정 */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBack}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>프로필 수정</Text>
                  <Pressable onPress={closeEdit} style={styles.sheetCloseBtn}>
                    <Text style={styles.sheetCloseText}>닫기</Text>
                  </Pressable>
                </View>

                {/* 사진 수정 */}
                <View style={styles.modalAvatarSection}>
                  <Pressable
                    onPress={pickPhoto}
                    style={styles.modalAvatarContainer}
                  >
                    {draftPhoto ? (
                      <Image
                        source={{ uri: draftPhoto }}
                        style={styles.modalAvatar}
                      />
                    ) : (
                      <View style={styles.modalAvatarPlaceholder}>
                        <Text style={{ fontSize: 30 }}>📸</Text>
                      </View>
                    )}
                    <View style={styles.cameraIconBadge}>
                      <Text style={{ fontSize: 12 }}>Edit</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    onPress={() => setDraftPhoto("")}
                    style={styles.photoDeleteBtn}
                  >
                    <Text style={styles.photoDeleteText}>사진 삭제</Text>
                  </Pressable>
                </View>

                {/* 이름 수정 */}
                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="이름을 입력하세요"
                  placeholderTextColor="#444"
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <Pressable onPress={save} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>저장하기</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", paddingHorizontal: 20 },
  container: { paddingBottom: 40 },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 24,
  },

  // 프로필 카드
  profileCard: {
    backgroundColor: "#161616",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#262626",
    marginBottom: 32,
  },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  avatar: { width: 72, height: 72 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262626",
  },
  avatarPlaceholderText: { fontSize: 32 },
  profileInfo: { marginLeft: 16, flex: 1 },
  nameText: { color: "#fff", fontSize: 20, fontWeight: "900" },
  subText: { color: "#6f7377", fontSize: 13, fontWeight: "600", marginTop: 4 },

  editBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  editBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  section: { marginBottom: 24 },
  sectionLabel: {
    color: "#6f7377",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4,
  },

  // 모달 스타일
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  keyboardView: { width: "100%" },
  sheet: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  sheetTitle: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sheetCloseBtn: { padding: 8, backgroundColor: "#161616", borderRadius: 12 },
  sheetCloseText: { color: "#6f7377", fontSize: 13, fontWeight: "700" },

  modalAvatarSection: { alignItems: "center", marginBottom: 24 },
  modalAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 36,
    position: "relative",
  },
  modalAvatar: { width: 100, height: 100, borderRadius: 36 },
  modalAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 36,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#6366F1",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#0b0b0b",
  },
  photoDeleteBtn: { marginTop: 12 },
  photoDeleteText: { color: "#ff4444", fontSize: 13, fontWeight: "700" },

  inputLabel: {
    color: "#6f7377",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 4,
  },
  input: {
    height: 56,
    borderRadius: 18,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#262626",
    color: "#fff",
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 24,
  },
  saveBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: "#6f7377",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#262626",
    gap: 16,
    marginTop: 10,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    backgroundColor: "#262626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  menuSub: {
    color: "#6f7377",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  menuArrow: {
    color: "#333",
    fontSize: 14,
    fontWeight: "900",
  },
  saveBtnText: { color: "#000", fontSize: 16, fontWeight: "900" },
});
