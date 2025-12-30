import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { useGoals } from "../src/goalsStore";

// 유틸리티 함수들 (동일)
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
  const { records, unachievedStats, updateRecord, removeRecord } = useGoals();
  const [tab, setTab] = useState("calendar");
  const slide = useRef(new Animated.Value(0)).current;

  // ✅ 반응형 탭 너비 계산용 상태
  const [containerWidth, setContainerWidth] = useState(0);
  const padding = 4; // tabsOuter의 padding 값
  const pillWidth = (containerWidth - padding * 2) / 2;

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

  // 모달 상태
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [memo, setMemo] = useState("");
  const [photoUri, setPhotoUri] = useState("");

  const openModal = (rec) => {
    setSelected(rec);
    setMemo(rec.memo || "");
    setPhotoUri(rec.photoUri || "");
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setSelected(null);
  };

  const confirmDelete = (rec) => {
    Alert.alert("기록 삭제", "이 소중한 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          removeRecord(rec.id);
          if (selected?.id === rec.id) closeModal();
        },
      },
    ]);
  };

  const pickPhoto = async () => {
    let res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    let res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    if (!selected) return;
    updateRecord(selected.id, { memo, photoUri });
    closeModal();
  };

  const weeks = useMemo(() => buildMonthGrid(pickedDate), [pickedDate]);

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <Text style={styles.title}>활동 기록</Text>

      {/* 탭  */}
      <View
        style={styles.tabsOuter}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && (
          <Animated.View
            style={[
              styles.tabsPill,
              {
                width: pillWidth,
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
            style={[styles.tabText, tab === "calendar" && styles.tabTextOn]}
          >
            캘린더
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab("list")} style={styles.tabBtn}>
          <Text style={[styles.tabText, tab === "list" && styles.tabTextOn]}>
            리스트
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {tab === "calendar" ? (
          <View style={styles.calendarCard}>
            {/* ... 캘린더 내부 로직 동일 ... */}
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
                style={styles.calNav}
              >
                <Text style={styles.calNavText}>◀</Text>
              </Pressable>
              <Text style={styles.calTitle}>
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
                style={styles.calNav}
              >
                <Text style={styles.calNavText}>▶</Text>
              </Pressable>
            </View>

            <View style={styles.dowRow}>
              {["일", "월", "화", "수", "목", "금", "토"].map((x) => (
                <Text key={x} style={styles.dowText}>
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
                      style={[styles.dayCell, isPicked && styles.dayCellOn]}
                    >
                      <Text
                        style={[styles.dayText, isPicked && styles.dayTextOn]}
                      >
                        {d ? d.getDate() : ""}
                      </Text>
                      {has ? (
                        <View
                          style={[
                            styles.dot,
                            isPicked && { backgroundColor: "#000" },
                          ]}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={styles.detailSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{pickedKey}</Text>
                <View style={styles.statRow}>
                  <View style={styles.statBadge}>
                    <Text style={styles.statSuccess}>
                      달성 {daySections.length}
                    </Text>
                  </View>
                  <View style={styles.statBadge}>
                    <Text style={styles.statFail}>
                      미달성 {unachievedStats[pickedKey] || 0}
                    </Text>
                  </View>
                </View>
              </View>

              {daySections.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptySub}>기록된 활동이 없습니다.</Text>
                </View>
              ) : (
                daySections.map((r, idx) => (
                  <AnimatedPressable
                    key={r.id}
                    onPress={() => openModal(r)}
                    onLongPress={() => confirmDelete(r)}
                    style={[styles.itemRow, idx == 0 && styles.itemRowFirst]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemText} numberOfLines={1}>
                        {r.text}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {r.memo || "추억을 기록해보세요"}
                      </Text>
                    </View>
                    {r.photoUri ? (
                      <Image
                        source={{ uri: r.photoUri }}
                        style={styles.thumb}
                      />
                    ) : (
                      <View style={styles.thumbPh}>
                        <Text style={{ fontSize: 10 }}>📷</Text>
                      </View>
                    )}
                  </AnimatedPressable>
                ))
              )}
            </View>
          </View>
        ) : (
          /* 리스트 탭 */
          sections.map((sec) => (
            <View key={sec.dateKey} style={{ marginTop: 20 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{sec.dateKey}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statSuccess}>
                    달성 {sec.items.length}
                  </Text>
                  <Text style={styles.statFail}>
                    미달성 {unachievedStats[sec.dateKey] || 0}
                  </Text>
                </View>
              </View>
              <View style={styles.calendarCard}>
                {sec.items.map((r, idx) => (
                  <AnimatedPressable
                    key={r.id}
                    onPress={() => openModal(r)}
                    onLongPress={() => confirmDelete(r)}
                    style={[styles.itemRow, idx == 0 && styles.itemRowFirst]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemText}>{r.text}</Text>
                      <Text style={styles.itemSub}>
                        {r.memo || "기록 없음"}
                      </Text>
                    </View>
                    {r.photoUri && (
                      <Image
                        source={{ uri: r.photoUri }}
                        style={styles.thumb}
                      />
                    )}
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 모달 */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBack}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%" }}
            >
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>활동 상세</Text>
                  <Pressable onPress={closeModal} style={styles.sheetCloseBtn}>
                    <Text style={styles.sheetCloseText}>닫기</Text>
                  </Pressable>
                </View>

                <Text style={styles.sheetGoalText}>{selected?.text}</Text>

                <Text style={styles.label}>사진 기록</Text>
                <View style={styles.photoActionRow}>
                  <Pressable onPress={pickPhoto} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>앨범</Text>
                  </Pressable>
                  <Pressable onPress={takePhoto} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>카메라</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPhotoUri("")}
                    style={[styles.actionBtn, { borderColor: "#331a1a" }]}
                  >
                    <Text style={[styles.actionBtnText, { color: "#ff4444" }]}>
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
                  <View style={styles.photoPlaceholder}>
                    <Text style={{ color: "#333" }}>사진을 등록해보세요</Text>
                  </View>
                )}

                <Text style={styles.label}>오늘의 소감</Text>
                <TextInput
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="무엇을 느끼셨나요?"
                  placeholderTextColor="#444"
                  style={styles.memoInput}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
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
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 20,
  },

  tabsOuter: {
    height: 48,
    borderRadius: 20,
    backgroundColor: "#161616",
    padding: 4, // 이 값이 padding 변수와 일치해야 함
    flexDirection: "row",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#262626",
    width: "100%",
  },
  tabsPill: {
    position: "absolute",
    height: 40,
    borderRadius: 16,
    backgroundColor: "#fff",
    top: 3,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabText: { color: "#6f7377", fontSize: 14, fontWeight: "800" },
  tabTextOn: { color: "#000" },

  calendarCard: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#262626",
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  calTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  calNav: {
    width: 40,
    height: 40,
    backgroundColor: "#262626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  calNavText: { color: "#fff", fontSize: 12 },
  dowRow: { flexDirection: "row", marginBottom: 10 },
  dowText: {
    flex: 1,
    textAlign: "center",
    color: "#6f7377",
    fontSize: 12,
    fontWeight: "700",
  },
  weekRow: { flexDirection: "row" },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 2,
  },
  dayCellOn: { backgroundColor: "#fff" },
  dayText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  dayTextOn: { color: "#000" },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6366F1",
    marginTop: 4,
  },

  detailSection: { marginTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  statRow: { flexDirection: "row", gap: 8 },
  statSuccess: { color: "#6366F1", fontSize: 11, fontWeight: "900" },
  statFail: { color: "#ff4444", fontSize: 11, fontWeight: "900" },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#262626",
  },
  itemRowFirst: { borderTopWidth: 0 },
  itemText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  itemSub: { color: "#6f7377", fontSize: 12, marginTop: 4, fontWeight: "600" },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#262626",
  },
  thumbPh: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0b0b0b",
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBox: { paddingVertical: 20, alignItems: "center" },
  emptySub: { color: "#444", fontSize: 13, fontWeight: "700" },

  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0b0b0b",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { color: "#fff", fontSize: 18, fontWeight: "900" },
  sheetCloseBtn: { padding: 8, backgroundColor: "#161616", borderRadius: 12 },
  sheetCloseText: { color: "#6f7377", fontSize: 13, fontWeight: "700" },
  sheetGoalText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 20,
  },

  label: {
    color: "#6f7377",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
    marginLeft: 4,
  },
  photoActionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    height: 44,
    backgroundColor: "#161616",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    marginBottom: 20,
  },
  photoPlaceholder: {
    width: "100%",
    height: 80,
    backgroundColor: "#0f0f0f",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  memoInput: {
    minHeight: 100,
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 16,
    color: "#fff",
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#262626",
  },
  saveBtn: {
    height: 56,
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#000", fontSize: 16, fontWeight: "900" },
});
