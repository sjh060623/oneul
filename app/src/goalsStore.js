import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";

const ACTIVE_KEY = "GOALS_V1";
const RECORDS_KEY = "GOAL_RECORDS_V1";
const DAILY_PREF_KEY = "DAILY_PREF_V1";
const UNACHIEVED_KEY = "UNACHIEVED_STATS_V1";

const GoalsCtx = createContext(null);

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeGoal(input) {
  const now = Date.now();
  if (typeof input === "string" || typeof input === "number") {
    const t = String(input || "").trim();
    if (!t) return null;
    return {
      id: uid(),
      text: t,
      type: "legacy",
      place: "",
      title: "",
      coord: null,
      createdAt: now,
    };
  }
  if (!input || typeof input !== "object") return null;
  const text = String(input.text ?? "").trim();
  if (!text) return null;
  const coord =
    input.coord &&
    Number.isFinite(Number(input.coord.latitude)) &&
    Number.isFinite(Number(input.coord.longitude))
      ? {
          latitude: Number(input.coord.latitude),
          longitude: Number(input.coord.longitude),
        }
      : null;
  return {
    id: String(input.id ?? uid()),
    text,
    type: String(input.type ?? "legacy"),
    place: String(input.place ?? ""),
    title: String(input.title ?? ""),
    coord,
    createdAt: Number(input.createdAt ?? now),
  };
}

function dateKeyFrom(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]);
  const [records, setRecords] = useState([]);
  const [reminderTime, setReminderTimeState] = useState("09:00");
  const [unachievedStats, setUnachievedStats] = useState({});
  const hydratedRef = useRef(false);

  const loadDataFromDisk = async () => {
    try {
      const [rawGoals, rawRecords, rawPref, rawStats] = await Promise.all([
        AsyncStorage.getItem(ACTIVE_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
        AsyncStorage.getItem(DAILY_PREF_KEY),
        AsyncStorage.getItem(UNACHIEVED_KEY),
      ]);

      if (rawStats) setUnachievedStats(JSON.parse(rawStats));
      if (rawPref) {
        const pref = JSON.parse(rawPref);
        setReminderTimeState(pref.timeHHMM || "09:00");
      }

      const g = rawGoals ? JSON.parse(rawGoals) : [];
      const r = rawRecords ? JSON.parse(rawRecords) : [];
      setGoals(Array.isArray(g) ? g.map(normalizeGoal).filter(Boolean) : []);
      setRecords(Array.isArray(r) ? r.filter((x) => x.text) : []);
    } catch (e) {
      console.error("데이터 로드 실패", e);
    } finally {
      hydratedRef.current = true;
    }
  };

  useEffect(() => {
    loadDataFromDisk();
    const subscription = DeviceEventEmitter.addListener(
      "REFRESH_GOALS",
      loadDataFromDisk
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (hydratedRef.current)
      AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(goals));
  }, [goals]);
  useEffect(() => {
    if (hydratedRef.current)
      AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }, [records]);
  useEffect(() => {
    if (hydratedRef.current)
      AsyncStorage.setItem(UNACHIEVED_KEY, JSON.stringify(unachievedStats));
  }, [unachievedStats]);

  const api = useMemo(() => {
    const clearPreviousDaysGoals = () => {
      const now = new Date();
      // [수정] reminderTime을 기준으로 기준 시간(cutoff) 계산
      const [targetH, targetM] = reminderTime.split(":").map(Number);
      const lastResetPoint = new Date();
      lastResetPoint.setHours(targetH, targetM, 0, 0);

      // 현재 시각이 설정 시각보다 전이라면, 실제 기준은 '어제의 설정 시각'임
      if (now < lastResetPoint) {
        lastResetPoint.setDate(lastResetPoint.getDate() - 1);
      }
      const cutoffTime = lastResetPoint.getTime();

      setGoals((prev) => {
        // 기준 시간보다 이전에 생성된 목표들만 삭제 및 미달성 기록 대상
        const toDelete = prev.filter((g) => g.createdAt < cutoffTime);

        if (toDelete.length > 0) {
          setUnachievedStats((prevStats) => {
            const nextStats = { ...prevStats };
            toDelete.forEach((g) => {
              const dKey = dateKeyFrom(g.createdAt);
              nextStats[dKey] = (nextStats[dKey] || 0) + 1;
            });
            return nextStats;
          });
        }
        // 기준 시간 이후에 생성된 목표만 유지
        return prev.filter((g) => g.createdAt >= cutoffTime);
      });
    };

    const addGoal = (goalLike) => {
      const g = normalizeGoal(goalLike);
      if (g) setGoals((prev) => [g, ...prev]);
    };

    const completeGoal = (id) => {
      setGoals((prev) => {
        const found = prev.find((g) => g.id === id);
        if (!found) return prev;
        const now = Date.now();
        const rec = {
          ...found,
          completedAt: now,
          dateKey: dateKeyFrom(now),
          memo: "",
          photoUri: "",
        };
        setRecords((rprev) => [rec, ...rprev]);
        return prev.filter((g) => g.id !== id);
      });
    };

    return {
      goals,
      records,
      reminderTime,
      unachievedStats,
      clearPreviousDaysGoals,
      setReminderTime: async (timeHHMM) => {
        setReminderTimeState(timeHHMM);
        try {
          await AsyncStorage.setItem(
            DAILY_PREF_KEY,
            JSON.stringify({ timeHHMM })
          );
        } catch {}
      },
      addGoal,
      completeGoal,
      removeGoal: (id) => setGoals((prev) => prev.filter((g) => g.id !== id)),
      updateRecord: (id, patch = {}) =>
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
        ),
      removeRecord: (id) =>
        setRecords((prev) => prev.filter((r) => r.id !== id)),
      clearAll: () => {
        setGoals([]);
        setRecords([]);
        setUnachievedStats({});
      },
      loadDataFromDisk,
    };
  }, [goals, records, reminderTime, unachievedStats]);

  return <GoalsCtx.Provider value={api}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const v = useContext(GoalsCtx);
  if (!v) throw new Error("useGoals must be used within <GoalsProvider>");
  return v;
}
