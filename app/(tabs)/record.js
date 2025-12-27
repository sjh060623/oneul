import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGoals } from "../src/goalsStore";
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
  const startDow = first.getDay(); // 0 Sun
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

export default function RecordScreen() {
  const { records, updateRecord } = useGoals();

  const [tab, setTab] = useState("calendar"); // calendar | list
  const slide = useRef(new Animated.Value(0)).current; // 0 or 1

  useEffect(() => {
    Animated.spring(slide, {
      toValue: tab === "calendar" ? 0 : 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [tab]);

  // 캘린더 선택 날짜
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

  // 모달
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
    setMemo("");
    setPhotoUri("");
  };
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
      if (uri) setPhotoUri(uri);
    } catch {}
  };
  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") return;

      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    } catch {}
  };
  const save = () => {
    if (!selected) return;
    updateRecord(selected.id, { memo, photoUri });
    closeModal();
  };

  const weeks = useMemo(() => buildMonthGrid(pickedDate), [pickedDate]);

  const indicatorX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <Text style={styles.title}>기록</Text>

      {/* 탭 */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsOuter}>
          <Animated.View
            style={[
              styles.tabsPill,
              {
                transform: [
                  {
                    translateX: indicatorX.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 180],
                    }),
                  },
                ],
              },
            ]}
          />
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
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        {tab === "calendar" ? (
          <View style={styles.card}>
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
                      style={[
                        styles.dayCell,
                        isPicked && styles.dayCellOn,
                        !d && styles.dayCellEmpty,
                      ]}
                    >
                      <Text
                        style={[styles.dayText, isPicked && styles.dayTextOn]}
                      >
                        {d ? d.getDate() : ""}
                      </Text>
                      {has ? <View style={styles.dot} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionTitle}>{pickedKey}</Text>

              {daySections.length === 0 ? (
                <Text style={styles.emptySub}>
                  이 날짜에는 완료 기록이 없어요.
                </Text>
              ) : (
                daySections.map((r, idx) => (
                  <Pressable
                    key={r.id}
                    onPress={() => openModal(r)}
                    style={[styles.itemRow, idx === 0 && { borderTopWidth: 0 }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemText} numberOfLines={1}>
                        {r.text}
                      </Text>
                      <Text style={styles.itemSub} numberOfLines={1}>
                        {r.memo ? r.memo : "소감/사진 추가하기"}
                      </Text>
                    </View>
                    {r.photoUri ? (
                      <Image
                        source={{ uri: r.photoUri }}
                        style={styles.thumb}
                      />
                    ) : (
                      <View style={styles.thumbPh} />
                    )}
                  </Pressable>
                ))
              )}
            </View>
          </View>
        ) : (
          <>
            {sections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
                <Text style={styles.emptySub}>
                  홈에서 목표를 완료하면 여기에 쌓여요.
                </Text>
              </View>
            ) : (
              sections.map((sec) => (
                <View key={sec.dateKey} style={{ marginTop: 12 }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{sec.dateKey}</Text>
                    <Text style={styles.sectionCount}>{sec.items.length}</Text>
                  </View>

                  <View style={styles.card}>
                    {sec.items.map((r, idx) => (
                      <Pressable
                        key={r.id}
                        onPress={() => openModal(r)}
                        style={[
                          styles.itemRow,
                          idx === 0 && { borderTopWidth: 0 },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemText} numberOfLines={1}>
                            {r.text}
                          </Text>
                          <Text style={styles.itemSub} numberOfLines={1}>
                            {r.memo ? r.memo : "소감/사진 추가하기"}
                          </Text>
                        </View>
                        {r.photoUri ? (
                          <Image
                            source={{ uri: r.photoUri }}
                            style={styles.thumb}
                          />
                        ) : (
                          <View style={styles.thumbPh} />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBack}>
          <Pressable style={{ flex: 1 }} onPress={closeModal} />
          <View style={styles.sheet}>
            <View style={styles.sheetTop}>
              <Text style={styles.sheetTitle}>기록</Text>
              <Pressable onPress={closeModal} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>닫기</Text>
              </Pressable>
            </View>

            <Text style={styles.sheetGoal} numberOfLines={2}>
              {selected?.text || ""}
            </Text>

            <Text style={styles.label}>사진</Text>

            <View style={styles.photoRow}>
              <Pressable onPress={pickPhoto} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>앨범</Text>
              </Pressable>

              <Pressable onPress={takePhoto} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>카메라</Text>
              </Pressable>

              <Pressable
                onPress={() => setPhotoUri("")}
                style={styles.btnGhost}
              >
                <Text style={styles.btnGhostText}>삭제</Text>
              </Pressable>
            </View>

            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.preview} />
            ) : null}

            <Text style={styles.label}>소감</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="짧게 적어도 됨"
              placeholderTextColor="#666"
              multiline
              style={styles.memo}
            />

            <Pressable onPress={save} style={styles.btnPrimary}>
              <Text style={styles.btnPrimaryText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000", paddingHorizontal: 16 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 12,
  },
  tabsWrap: { marginBottom: 10 },
  tabsOuter: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#121212",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
  },
  tabsPill: {
    position: "absolute",
    left: 2,
    top: 2,
    bottom: 2,
    width: 180,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
  tabBtn: { width: 180, alignItems: "center", justifyContent: "center" },
  tabText: { color: "#6f7377", fontSize: 13, fontWeight: "900" },
  tabTextOn: { color: "#000" },

  emptyCard: {
    backgroundColor: "#121212",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  emptyTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
  emptySub: { color: "#6f7377", fontSize: 12, marginTop: 8, fontWeight: "800" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  sectionCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: "#1f1f1f",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  card: {
    backgroundColor: "#121212",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    overflow: "hidden",
    padding: 14,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
  },
  itemText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  itemSub: { color: "#6f7377", fontSize: 12, marginTop: 4, fontWeight: "800" },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#222" },
  thumbPh: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#1f1f1f",
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

  // calendar
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calTitle: { color: "#fff", fontSize: 14, fontWeight: "900" },
  calNav: {
    width: 38,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  calNavText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  dowRow: { flexDirection: "row", marginBottom: 6 },
  dowText: {
    width: "14.2857%",
    textAlign: "center",
    color: "#6f7377",
    fontSize: 12,
    fontWeight: "900",
  },
  weekRow: { flexDirection: "row" },
  dayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    marginVertical: 2,
  },
  dayCellEmpty: { opacity: 0.25 },
  dayCellOn: { backgroundColor: "#fff" },
  dayText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  dayTextOn: { color: "#000" },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginTop: 6,
  },

  // modal
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
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
  sheetGoal: { color: "#fff", fontSize: 14, fontWeight: "900", marginTop: 10 },

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
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginTop: 12,
    backgroundColor: "#111",
  },
  memo: {
    marginTop: 8,
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    color: "#fff",
    padding: 12,
    fontSize: 13,
    fontWeight: "800",
  },

  btnPrimary: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: "#000", fontSize: 13, fontWeight: "900" },
});
