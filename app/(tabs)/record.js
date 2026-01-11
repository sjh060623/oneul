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
import ShareCard from "../components/ShareCard";
import { useGoals } from "../src/goalsStore";

const { width, height } = Dimensions.get("window");
const PROFILE_KEY = "PROFILE_V1";

// 헬퍼 함수
function groupByDate(records) {
  const arr = Array.isArray(records) ? records : [];
  const map = new Map();
  for (const r of arr) {
    const k = r?.dateKey || "unknown";
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(r);
  }
  const keys = Array.from(map.keys()).sort((a, b) => (a < b ? 1 : -1));
  return keys.map((k) => ({ dateKey: k, items: map.get(k) }));
}

function fmtDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function buildMonthGrid(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const last = new Date(y, m + 1, 0);
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

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

const AnimatedPressable = ({ children, onPress, onLongPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        onLongPress={onLongPress}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

export default function RecordScreen() {
  const shareCardRef = useRef();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const { records, unachievedStats, updateRecord, removeRecord } = useGoals();
  const [tab, setTab] = useState("calendar");
  const slide = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);
  const [profile, setProfile] = useState({ name: "사용자" });

  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  const [open, setOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [memo, setMemo] = useState("");
  const [photoUri, setPhotoUri] = useState("");

  const padding = 4;
  const pillWidth = (containerWidth - padding * 2) / 2;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) setProfile(JSON.parse(raw));
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
  }, [viewerOpen, open]);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: tab === "calendar" ? 0 : 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
    }).start();
  }, [tab]);

  const [pickedDate, setPickedDate] = useState(() => new Date());
  const pickedKey = useMemo(() => fmtDateKey(pickedDate), [pickedDate]);
  const sections = useMemo(() => groupByDate(records), [records]);
  const recordCountByDate = useMemo(() => {
    const map = new Map();
    for (const s of sections) map.set(s.dateKey, s.items.length);
    return map;
  }, [sections]);

  const daySections = useMemo(() => {
    const hit = sections.find((s) => s.dateKey === pickedKey);
    return hit ? hit.items : [];
  }, [sections, pickedKey]);

  const handleItemPress = (rec) => {
    setSelected(rec);
    setMemo(rec.memo || "");
    setPhotoUri(rec.photoUri || "");
    if (rec.memo || rec.photoUri) setViewerOpen(true);
    else setOpen(true);
  };

  const onInstagramShare = () => {
    if (shareCardRef.current) shareCardRef.current.captureAndShare();
  };
  const closeModal = () => {
    setOpen(false);
    setViewerOpen(false);
    setSelected(null);
  };
  const switchToEditor = () => {
    setViewerOpen(false);
    setTimeout(() => setOpen(true), 300);
  };

  const save = () => {
    if (!selected) return;
    updateRecord(selected.id, { memo, photoUri });
    closeModal();
  };

  // 권한 오류
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "갤러리 접근 권한을 허용해 주세요.");
      return;
    }
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  // 권한 오류
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("권한 필요", "카메라 접근 권한을 허용해 주세요.");
      return;
    }
    let res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const confirmDelete = (rec) => {
    Alert.alert("기록 삭제", "이 소중한 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          removeRecord(rec.id);
          closeModal();
        },
      },
    ]);
  };

  const weeks = useMemo(() => buildMonthGrid(pickedDate), [pickedDate]);

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

      <View style={styles.header}>
        <Text style={[styles.dateText, { color: theme.primary }]}>
          Activity Logs
        </Text>
        <Text style={[styles.title, { color: theme.text }]}>활동 기록</Text>
      </View>

      <View
        style={[styles.tabsOuter, { backgroundColor: theme.progressTrack }]}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.tabsPill,
              {
                width: pillWidth,
                backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "#FFF",
                transform: [
                  {
                    translateX: slide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [padding, padding + pillWidth],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <Pressable onPress={() => setTab("calendar")} style={styles.tabBtn}>
          <Text
            style={[
              styles.tabText,
              { color: tab === "calendar" ? theme.text : theme.subText },
            ]}
          >
            캘린더
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab("list")} style={styles.tabBtn}>
          <Text
            style={[
              styles.tabText,
              { color: tab === "list" ? theme.text : theme.subText },
            ]}
          >
            리스트
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "calendar" ? (
          <View>
            <GlassCard style={styles.cardMargin} isDark={isDark}>
              <View style={styles.calHeader}>
                <Pressable
                  onPress={() =>
                    setPickedDate(
                      new Date(
                        pickedDate.getFullYear(),
                        pickedDate.getMonth() - 1,
                        1
                      )
                    )
                  }
                  style={[
                    styles.calNav,
                    { backgroundColor: theme.progressTrack },
                  ]}
                >
                  <Text style={{ color: theme.text }}>◀</Text>
                </Pressable>
                <Text style={[styles.calTitle, { color: theme.text }]}>
                  {pickedDate.getFullYear()}년 {pickedDate.getMonth() + 1}월
                </Text>
                <Pressable
                  onPress={() =>
                    setPickedDate(
                      new Date(
                        pickedDate.getFullYear(),
                        pickedDate.getMonth() + 1,
                        1
                      )
                    )
                  }
                  style={[
                    styles.calNav,
                    { backgroundColor: theme.progressTrack },
                  ]}
                >
                  <Text style={{ color: theme.text }}>▶</Text>
                </Pressable>
              </View>
              <View style={styles.dowRow}>
                {["일", "월", "화", "수", "목", "금", "토"].map((x) => (
                  <Text
                    key={x}
                    style={[styles.dowText, { color: theme.subText }]}
                  >
                    {x}
                  </Text>
                ))}
              </View>
              {weeks.map((w, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {w.map((d, di) => {
                    const key = d ? fmtDateKey(d) : null;
                    const has = key ? recordCountByDate.get(key) || 0 : 0;
                    const isPicked = key && key === pickedKey;
                    return (
                      <Pressable
                        key={di}
                        disabled={!d}
                        onPress={() => d && setPickedDate(d)}
                        style={[
                          styles.dayCell,
                          isPicked && { backgroundColor: theme.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: isPicked
                                ? isDark
                                  ? "#000"
                                  : "#FFF"
                                : theme.text,
                            },
                          ]}
                        >
                          {d ? d.getDate() : ""}
                        </Text>
                        {has ? (
                          <View
                            style={[
                              styles.dot,
                              {
                                backgroundColor: isPicked
                                  ? isDark
                                    ? "#000"
                                    : "#FFF"
                                  : theme.primary,
                              },
                            ]}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </GlassCard>

            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>
                  {pickedKey}
                </Text>
                <View style={styles.statRow}>
                  <Text style={[styles.statSuccess, { color: theme.primary }]}>
                    달성 {daySections.length}
                  </Text>
                  <Text style={[styles.statFail, { color: "#FF6B6B" }]}>
                    미달성 {unachievedStats[pickedKey] || 0}
                  </Text>
                </View>
              </View>
              {daySections.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={[styles.emptySub, { color: theme.subText }]}>
                    기록된 활동이 없어요.
                  </Text>
                </View>
              ) : (
                daySections.map((r) => (
                  <AnimatedPressable
                    key={r.id}
                    onPress={() => handleItemPress(r)}
                    onLongPress={() => confirmDelete(r)}
                    style={{ marginBottom: 12 }}
                  >
                    <GlassCard
                      isDark={isDark}
                      intensity={20}
                      style={styles.itemCard}
                    >
                      <View style={styles.itemContent}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.itemText, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {r.text}
                          </Text>
                          <Text
                            style={[styles.itemSub, { color: theme.subText }]}
                            numberOfLines={1}
                          >
                            {r.memo || "추억을 기록해 보세요"}
                          </Text>
                        </View>
                        {r.photoUri ? (
                          <Image
                            source={{ uri: r.photoUri }}
                            style={styles.thumb}
                          />
                        ) : (
                          <View
                            style={[
                              styles.thumbPh,
                              {
                                backgroundColor: theme.progressTrack,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <Text style={{ fontSize: 12 }}>📷</Text>
                          </View>
                        )}
                      </View>
                    </GlassCard>
                  </AnimatedPressable>
                ))
              )}
            </View>
          </View>
        ) : (
          sections.map((sec) => (
            <View key={sec.dateKey} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.subText }]}>
                  {sec.dateKey}
                </Text>
                <View style={styles.statRow}>
                  <Text style={[styles.statSuccess, { color: theme.primary }]}>
                    달성 {sec.items.length}
                  </Text>
                  <Text style={[styles.statFail, { color: "#FF6B6B" }]}>
                    미달성 {unachievedStats[sec.dateKey] || 0}
                  </Text>
                </View>
              </View>
              {sec.items.map((r) => (
                <AnimatedPressable
                  key={r.id}
                  onPress={() => handleItemPress(r)}
                  onLongPress={() => confirmDelete(r)}
                  style={{ marginBottom: 12 }}
                >
                  <GlassCard
                    isDark={isDark}
                    intensity={20}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemText, { color: theme.text }]}>
                          {r.text}
                        </Text>
                        <Text
                          style={[styles.itemSub, { color: theme.subText }]}
                        >
                          {r.memo || "추억을 기록해 보세요"}
                        </Text>
                      </View>
                      {r.photoUri && (
                        <Image
                          source={{ uri: r.photoUri }}
                          style={styles.thumb}
                        />
                      )}
                    </View>
                  </GlassCard>
                </AnimatedPressable>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <ShareCard
        ref={shareCardRef}
        data={selected}
        isDark={isDark}
        userName={profile.name}
      />

      {/* --- 1. Viewer 모달 (전체화면 개편) --- */}
      <Modal
        visible={viewerOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View
          style={[
            styles.fullViewerContainer,
            { backgroundColor: theme.background },
          ]}
        >
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

          <SafeAreaView style={{ flex: 1 }}>
            {/* 상단 헤더 */}
            <View style={styles.viewerHeader}>
              <Pressable
                onPress={closeModal}
                style={[
                  styles.closeBtn,
                  { backgroundColor: theme.progressTrack },
                ]}
              >
                <Text style={{ color: theme.text, fontWeight: "700" }}>
                  닫기
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={switchToEditor}
                  style={[
                    styles.vEditBtn,
                    { backgroundColor: theme.progressTrack },
                  ]}
                >
                  <Text style={{ color: theme.text, fontWeight: "700" }}>
                    수정
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onInstagramShare}
                  style={[styles.vShareBtn, { backgroundColor: theme.primary }]}
                >
                  <Text style={styles.vShareBtnText}>공유</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.viewerInnerCard}>
                <GlassCard isDark={isDark} style={{ borderRadius: 32 }}>
                  <View
                    style={[
                      styles.viewerImageWrapper,
                      { backgroundColor: theme.progressTrack },
                    ]}
                  >
                    {selected?.photoUri ? (
                      <Image
                        source={{ uri: selected.photoUri }}
                        style={styles.viewerImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 50 }}>🖼️</Text>
                    )}
                  </View>
                  <View style={styles.viewerTextContent}>
                    <Text style={[styles.vDate, { color: theme.primary }]}>
                      {selected?.dateKey}
                    </Text>
                    <Text style={[styles.vTitle, { color: theme.text }]}>
                      {selected?.text}
                    </Text>
                    <View
                      style={[
                        styles.vDivider,
                        { backgroundColor: theme.progressTrack },
                      ]}
                    />
                    <Text style={[styles.vMemo, { color: theme.text }]}>
                      {selected?.memo || "기록된 소감이 없습니다."}
                    </Text>
                  </View>
                </GlassCard>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* --- 2. Editor 모달 (하단 유리 시트 유지) --- */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
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
                <View style={styles.dragHandle} />
                <View style={styles.modalHeader}>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    기록 수정
                  </Text>
                  <Pressable
                    onPress={closeModal}
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
                  <Text style={[styles.sheetGoalText, { color: theme.text }]}>
                    {selected?.text}
                  </Text>
                  <Text style={[styles.label, { color: theme.subText }]}>
                    사진 기록
                  </Text>
                  <View style={styles.photoActionRow}>
                    <Pressable
                      onPress={pickPhoto}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: theme.progressTrack,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "700" }}>
                        앨범
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={takePhoto}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: theme.progressTrack,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.text, fontWeight: "700" }}>
                        카메라
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setPhotoUri("")}
                      style={[styles.actionBtn, { borderColor: "#FF6B6B" }]}
                    >
                      <Text style={{ color: "#FF6B6B", fontWeight: "700" }}>
                        삭제
                      </Text>
                    </Pressable>
                  </View>
                  {photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoPlaceholder,
                        {
                          backgroundColor: theme.progressTrack,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text style={{ color: theme.subText }}>
                        사진을 등록해 보세요
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.label, { color: theme.subText }]}>
                    오늘의 소감
                  </Text>
                  <TextInput
                    value={memo}
                    onChangeText={setMemo}
                    placeholder="무엇을 느끼셨나요?"
                    placeholderTextColor={theme.subText}
                    style={[
                      styles.memoInput,
                      {
                        backgroundColor: theme.progressTrack,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    multiline
                    textAlignVertical="top"
                  />
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
  border: "rgba(0,0,0,0.05)",
};
const darkTheme = {
  background: "#0D0B14",
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  glowColor: "rgba(167, 139, 250, 0.2)",
  progressTrack: "rgba(255,255,255,0.1)",
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
  header: { paddingHorizontal: 24, marginTop: 20, marginBottom: 20 },
  dateText: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800" },
  tabsOuter: {
    height: 48,
    borderRadius: 24,
    padding: 4,
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
  },
  tabsPill: { position: "absolute", height: 40, borderRadius: 20, top: 4 },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: { fontSize: 14, fontWeight: "800" },
  glassWrapper: { borderRadius: 28, overflow: "hidden", borderWidth: 1 },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  glassPadding: { padding: 20 },
  cardMargin: { marginHorizontal: 20 },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  calTitle: { fontSize: 17, fontWeight: "900" },
  calNav: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dowRow: { flexDirection: "row", marginBottom: 10 },
  dowText: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700" },
  weekRow: { flexDirection: "row" },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 2,
  },
  dayText: { fontSize: 14, fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 4 },
  detailSection: { marginTop: 32, paddingHorizontal: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  statRow: { flexDirection: "row", gap: 12 },
  statSuccess: { fontSize: 12, fontWeight: "900" },
  statFail: { fontSize: 12, fontWeight: "900" },
  itemCard: { borderRadius: 20 },
  itemContent: { flexDirection: "row", alignItems: "center" },
  itemText: { fontSize: 15, fontWeight: "700" },
  itemSub: { fontSize: 13, marginTop: 4, fontWeight: "500" },
  thumb: { width: 52, height: 52, borderRadius: 14 },
  thumbPh: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 24, marginTop: 24 },
  emptyBox: { paddingVertical: 40, alignItems: "center" },
  emptySub: { fontSize: 15, fontWeight: "600" },

  fullViewerContainer: { flex: 1 },
  viewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 150,
  },
  viewerInnerCard: { paddingBottom: 40 },
  viewerImageWrapper: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "100%" },
  viewerTextContent: { padding: 24 },
  vDate: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
  vTitle: { fontSize: 24, fontWeight: "900", marginBottom: 16 },
  vDivider: { height: 1, marginVertical: 20 },
  vMemo: { fontSize: 16, lineHeight: 26, fontWeight: "500" },
  vEditBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  vShareBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  vShareBtnText: { color: "#FFF", fontWeight: "800", fontSize: 13 },

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
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 19, fontWeight: "900" },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  sheetGoalText: { fontSize: 17, fontWeight: "700", marginBottom: 24 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 12 },
  photoActionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  photoPreview: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    marginBottom: 24,
  },
  photoPlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  memoInput: {
    minHeight: 120,
    borderRadius: 20,
    padding: 20,
    fontSize: 15,
    marginBottom: 28,
    borderWidth: 1,
  },
  saveBtn: {
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { fontSize: 17, fontWeight: "900" },
});
