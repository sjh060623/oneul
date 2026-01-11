import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { DeviceMotion } from "expo-sensors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DailyTimeSetting from "../components/DailyTimeSetting";
import GeoReset from "../components/goeReset";

const { width, height } = Dimensions.get("window");
const PROFILE_KEY = "PROFILE_V1";

const GlassCard = ({ children, style, intensity = 40, isDark }) => (
  <View
    style={[
      styles.glassWrapper,
      style,
      isDark ? styles.darkBorder : styles.lightBorder,
    ]}
  >
    <BlurView
      intensity={intensity}
      tint={isDark ? "dark" : "light"}
      style={styles.glassPadding}
    >
      {children}
    </BlurView>
  </View>
);

export default function Profile() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const [profile, setProfile] = useState({ name: "", photoUri: "" });
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftPhoto, setDraftPhoto] = useState("");

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 프로필 로드
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setProfile({
            name: String(parsed?.name || ""),
            photoUri: String(parsed?.photoUri || ""),
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadProfile();

    DeviceMotion.setUpdateInterval(16);
    const subscription = DeviceMotion.addListener(({ rotation }) => {
      if (rotation) {
        const { gamma, beta } = rotation;
        Animated.spring(tiltX, {
          toValue: gamma * 50,
          useNativeDriver: true,
          friction: 8,
        }).start();
        Animated.spring(tiltY, {
          toValue: (beta - 1) * 50,
          useNativeDriver: true,
          friction: 8,
        }).start();
      }
    });

    return () => subscription.remove();
  }, [open]);

  const displayName = useMemo(
    () => profile.name.trim() || "이름을 설정해 주세요",
    [profile.name]
  );

  const openEdit = () => {
    setDraftName(profile.name);
    setDraftPhoto(profile.photoUri);
    setOpen(true);
  };
  const closeEdit = () => setOpen(false);

  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("권한 필요", "사진을 선택하려면 갤러리 권한이 필요해요.");
        return;
      }
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
    const next = { name: draftName.trim(), photoUri: draftPhoto };
    setProfile(next);
    setOpen(false);
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    } catch {}
  };

  const replayTutorial = async () => {
    Alert.alert(
      "튜토리얼 재설정",
      "가이드 화면이 다시 나타나도록 설정할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("APP_HAS_LAUNCHED_V1");
              Alert.alert("설정 완료", "앱을 재시작하면 튜토리얼이 나타나요.");
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
      edges={["top", "left", "right"]}
    >
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.header}>
          <Text style={[styles.dateText, { color: theme.primary }]}>
            Settings
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>프로필</Text>
        </View>

        <GlassCard style={styles.cardMargin} isDark={isDark} intensity={30}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              {profile.photoUri ? (
                <Image
                  source={{ uri: profile.photoUri }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarEmoji}>{isDark ? "🌙" : "☀️"}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.nameText, { color: theme.text }]}>
                {displayName}
              </Text>
              <Text style={[styles.subText, { color: theme.primary }]}>
                오늘 하루도 소중하게
              </Text>
            </View>
          </View>
          <Pressable
            onPress={openEdit}
            style={[styles.editBtn, { backgroundColor: theme.addBtnBg }]}
          >
            <Text style={[styles.editBtnText, { color: theme.primary }]}>
              프로필 관리
            </Text>
          </Pressable>
        </GlassCard>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subText }]}>
            나의 루틴
          </Text>
          <GlassCard isDark={isDark} intensity={20}>
            <DailyTimeSetting />
          </GlassCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: theme.subText }]}>
            시스템 및 가이드
          </Text>
          <GlassCard isDark={isDark} intensity={20}>
            <GeoReset />
            <View
              style={[styles.divider, { backgroundColor: theme.progressTrack }]}
            />
            <Pressable onPress={replayTutorial} style={styles.menuItem}>
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: theme.addBtnBg },
                ]}
              >
                <Text style={{ fontSize: 14 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: theme.text }]}>
                  튜토리얼 다시보기
                </Text>
              </View>
              <Text style={[styles.menuArrow, { color: theme.subText }]}>
                〉
              </Text>
            </Pressable>
          </GlassCard>
        </View>
        <View style={{ marginBottom: 70 }} />
      </ScrollView>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEdit} />

          <View style={styles.glowContainer} pointerEvents="none"></View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View
              style={[
                styles.glassWrapper,
                styles.modalSheet,
                isDark ? styles.darkBorder : styles.lightBorder,
              ]}
            >
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? "dark" : "light"}
                style={styles.sheetContent}
              >
                <View
                  style={[
                    styles.sheetHandle,
                    { backgroundColor: theme.progressTrack },
                  ]}
                />

                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    프로필 설정
                  </Text>
                  <Pressable
                    onPress={closeEdit}
                    style={[
                      styles.closeBtn,
                      { backgroundColor: theme.progressTrack },
                    ]}
                  >
                    <Text style={{ color: theme.subText, fontWeight: "700" }}>
                      취소
                    </Text>
                  </Pressable>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.modalAvatarSection}>
                    <Pressable
                      onPress={pickPhoto}
                      style={[
                        styles.modalAvatarContainer,
                        { backgroundColor: theme.progressTrack },
                      ]}
                    >
                      {draftPhoto ? (
                        <Image
                          source={{ uri: draftPhoto }}
                          style={styles.modalAvatar}
                        />
                      ) : (
                        <View style={styles.modalAvatarPlaceholder}>
                          <Text style={{ fontSize: 40 }}>👤</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.cameraIconBadge,
                          {
                            backgroundColor: theme.primary,
                            borderColor: isDark ? "#16161D" : "#FFF",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.cameraIconText,
                            { color: isDark ? "#000" : "#FFF" },
                          ]}
                        >
                          변경
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => setDraftPhoto("")}
                      style={styles.photoDeleteBtn}
                    >
                      <Text style={styles.photoDeleteText}>사진 삭제</Text>
                    </Pressable>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.subText }]}>
                      이름
                    </Text>
                    <TextInput
                      value={draftName}
                      onChangeText={setDraftName}
                      placeholder="당신의 이름을 알려주세요"
                      placeholderTextColor={theme.subText}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.progressTrack,
                          color: theme.text,
                        },
                      ]}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>

                  <Pressable
                    onPress={save}
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
                      저장하기
                    </Text>
                  </Pressable>
                </ScrollView>
              </BlurView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const lightTheme = {
  background: "#F0F2F9",
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  glowColor: "rgba(129, 140, 248, 0.15)",
  progressTrack: "rgba(0,0,0,0.05)",
  addBtnBg: "#F8F9FF",
  border: "rgba(0,0,0,0.05)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  glowColor: "rgba(167, 139, 250, 0.2)",
  progressTrack: "rgba(255,255,255,0.1)",
  addBtnBg: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.1)",
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
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  container: { paddingBottom: 40 },
  header: { paddingHorizontal: 24, marginTop: 20, marginBottom: 24 },
  dateText: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800" },

  glassWrapper: { borderRadius: 32, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  glassPadding: { padding: 24 },
  cardMargin: { marginHorizontal: 20, marginBottom: 28 },

  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  avatar: { width: 72, height: 72 },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 32 },
  profileInfo: { marginLeft: 16, flex: 1 },
  nameText: { fontSize: 20, fontWeight: "800" },
  subText: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  editBtn: {
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  editBtnText: { fontSize: 14, fontWeight: "700" },

  section: { marginHorizontal: 20, marginBottom: 24 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  menuTitle: { fontSize: 15, fontWeight: "600" },
  menuArrow: { fontSize: 16 },
  divider: { height: 1, marginVertical: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: { width: "100%" },
  modalSheet: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  sheetTitle: { fontSize: 19, fontWeight: "900" },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },

  modalAvatarSection: { alignItems: "center", marginBottom: 32 },
  modalAvatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: "hidden",
  },
  modalAvatar: { width: 110, height: 110, borderRadius: 55 },
  modalAvatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIconBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 3,
  },
  cameraIconText: { fontSize: 11, fontWeight: "800" },
  photoDeleteBtn: { marginTop: 12 },
  photoDeleteText: { color: "#FF6B6B", fontSize: 14, fontWeight: "600" },
  inputGroup: { marginBottom: 24 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 16 },
  saveBtn: {
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 17, fontWeight: "800" },
});
