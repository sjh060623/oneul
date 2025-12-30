import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useGoals } from "../src/goalsStore";

// 유틸
const pad2 = (n) => String(n).padStart(2, "0");
const hhmmFromDate = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const dateFromHHMM = (hhmm) => {
  const d = new Date();
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ""));
  m ? d.setHours(Number(m[1]), Number(m[2]), 0, 0) : d.setHours(9, 0, 0, 0);
  return d;
};

export default function DailyTimeSetting() {
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
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>알림 시간 설정</Text>
        <Pressable onPress={openPicker} style={styles.pill}>
          <Text style={styles.pillText}>{reminderTime}</Text>
        </Pressable>
      </View>

      {Platform.OS === "android" && open && (
        <DateTimePicker
          value={draft}
          mode="time"
          is24Hour
          display="default"
          onChange={onChangeAndroid}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={open} transparent animationType="slide">
          <View style={styles.modalBack}>
            <View style={styles.sheet}>
              <View style={styles.sheetTop}>
                <Text style={styles.sheetTitle}>시간 선택</Text>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={{ color: "#fff" }}>취소</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="time"
                is24Hour
                textColor="#ffffff"
                display="spinner"
                onChange={(_, d) => d && setDraft(d)}
              />
              <Pressable onPress={doneIOS} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>저장하기</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#121212",
    marginTop: 10,
    borderRadius: 18,
    padding: 16,
    borderWdith: 1,
    borderColor: "#1f1f1f",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", fontWeight: "900" },
  pill: {
    backgroundColor: "#1f1f1f",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  pillText: { color: "#fff", fontWeight: "900" },
  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0b0b0b",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  primaryBtn: {
    marginTop: 15,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontWeight: "bold" },
});
