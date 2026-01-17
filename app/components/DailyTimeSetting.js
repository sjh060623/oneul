import DateTimePicker from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import React, { useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useGoals } from "../src/goalsStore";

const { width } = Dimensions.get("window");

const pad2 = (n) => String(n).padStart(2, "0");
const hhmmFromDate = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const dateFromHHMM = (hhmm) => {
  const d = new Date();
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  m ? d.setHours(Number(m[1]), Number(m[2]), 0, 0) : d.setHours(9, 0, 0, 0);
  return d;
};

export default function DailyTimeSetting() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  const { reminderTime, setReminderTime } = useGoals();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(dateFromHHMM(reminderTime));

  const openPicker = () => {
    setDraft(dateFromHHMM(reminderTime));
    setOpen(true);
  };

  const handleSave = async (selectedDate) => {
    const hhmm = hhmmFromDate(selectedDate);
    await setReminderTime(hhmm);
  };

  const onChangeAndroid = async (_e, selectedDate) => {
    setOpen(false);
    if (selectedDate) await handleSave(selectedDate);
  };

  const doneIOS = async () => {
    await handleSave(draft);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.textGroup}>
          <Text style={[styles.title, { color: theme.text }]}>
            목표 시간 설정
          </Text>
          <Text style={[styles.subText, { color: theme.subText }]}>
            매일 목표를 설정할 시간이에요.
          </Text>
        </View>
        <Pressable
          onPress={openPicker}
          style={[
            styles.pill,
            { backgroundColor: theme.badgeBg, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.pillText, { color: theme.primary }]}>
            {reminderTime}
          </Text>
        </Pressable>
      </View>

      {/* 안드로이드 시간 선택기 (시스템 기본) */}
      {Platform.OS === "android" && open && (
        <DateTimePicker
          value={draft}
          mode="time"
          is24Hour
          display="default"
          onChange={onChangeAndroid}
        />
      )}

      {/* iOS 시간 선택기 (글래스모피즘 + 백드롭 닫기) */}
      {Platform.OS === "ios" && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalOverlay}>
            {/* 모달 밖 영역 터치 시 닫기 */}
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setOpen(false)}
            />

            <View
              style={[
                styles.glassWrapper,
                isDark ? styles.darkBorder : styles.lightBorder,
              ]}
            >
              <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? "dark" : "light"}
                style={styles.sheetContent}
              >
                {/* 상단 드래그 핸들 */}
                <View
                  style={[
                    styles.sheetHandle,
                    { backgroundColor: theme.progressTrack },
                  ]}
                />

                <View style={styles.sheetTop}>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>
                    시간 선택
                  </Text>
                  <Pressable
                    onPress={() => setOpen(false)}
                    style={[
                      styles.closeBtn,
                      { backgroundColor: theme.progressTrack },
                    ]}
                  >
                    <Text
                      style={[styles.closeBtnText, { color: theme.subText }]}
                    >
                      취소
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={draft}
                    mode="time"
                    is24Hour
                    textColor={isDark ? "#FFFFFF" : "#000000"}
                    display="spinner"
                    onChange={(_, d) => d && setDraft(d)}
                    style={{ width: width - 48 }}
                  />
                </View>

                <Pressable
                  onPress={doneIOS}
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
              </BlurView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const lightTheme = {
  text: "#2D3748",
  subText: "#718096",
  primary: "#818CF8",
  badgeBg: "#F8F9FF",
  progressTrack: "rgba(0,0,0,0.05)",
  border: "rgba(0,0,0,0.05)",
};
const darkTheme = {
  text: "#FFF",
  subText: "rgba(255,255,255,0.4)",
  primary: "#A78BFA",
  badgeBg: "rgba(167, 139, 250, 0.1)",
  progressTrack: "rgba(255,255,255,0.1)",
  border: "rgba(255,255,255,0.1)",
};

const styles = StyleSheet.create({
  container: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textGroup: { flex: 1 },
  title: { fontWeight: "700", fontSize: 16 },
  subText: { fontSize: 12, marginTop: 4, fontWeight: "500" },
  pill: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  pillText: { fontWeight: "800", fontSize: 16, letterSpacing: 0.5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  glassWrapper: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
  },
  lightBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  darkBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.15)",
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
  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 19, fontWeight: "900" },
  closeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  closeBtnText: { fontWeight: "700", fontSize: 14 },

  pickerContainer: {
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtn: {
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  saveBtnText: { fontWeight: "900", fontSize: 17 },
});
