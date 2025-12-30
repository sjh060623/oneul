// app/src/goalsStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ACTIVE_KEY = "GOALS_V1";
const RECORDS_KEY = "GOAL_RECORDS_V1";
const DAILY_PREF_KEY = "DAILY_PREF_V1";
const UNACHIEVED_KEY = "UNACHIEVED_STATS_V1"; // 미달성 기록용 키 추가

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
  const [unachievedStats, setUnachievedStats] = useState({}); // { "YYYY-MM-DD" }
  const hydratedRef = useRef(false);

  // 초기 로딩
  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const [rawGoals, rawRecords, rawPref, rawStats] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_KEY),
          AsyncStorage.getItem(RECORDS_KEY),
          AsyncStorage.getItem(DAILY_PREF_KEY),
          AsyncStorage.getItem(UNACHIEVED_KEY),
        ]);

        if (!mounted) return;

        if (rawStats) setUnachievedStats(JSON.parse(rawStats));
        if (rawPref) {
          const pref = JSON.parse(rawPref);
          setReminderTimeState(pref.timeHHMM || "09:00");
        }

        const g = rawGoals ? JSON.parse(rawGoals) : [];
        const r = rawRecords ? JSON.parse(rawRecords) : [];

        const nextGoals = Array.isArray(g)
          ? g.map(normalizeGoal).filter(Boolean)
          : [];
        const nextRecords = Array.isArray(r) ? r.filter((x) => x.text) : [];

        setGoals(nextGoals);
        setRecords(nextRecords);
      } catch {
        if (mounted) {
          setGoals([]);
          setRecords([]);
        }
      } finally {
        hydratedRef.current = true;
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  const setReminderTime = async (timeHHMM) => {
    setReminderTimeState(timeHHMM);
    try {
      await AsyncStorage.setItem(DAILY_PREF_KEY, JSON.stringify({ timeHHMM }));
    } catch {}
  };

  const loadSettings = async () => {
    try {
      const raw = await AsyncStorage.getItem(DAILY_PREF_KEY);
      if (raw) setReminderTimeState(JSON.parse(raw).timeHHMM);
    } catch {}
  };

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(goals)).catch(() => {});
  }, [goals]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records)).catch(() => {});
  }, [records]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(UNACHIEVED_KEY, JSON.stringify(unachievedStats)).catch(
      () => {}
    );
  }, [unachievedStats]);

  const api = useMemo(() => {
    const clearPreviousDaysGoals = () => {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      setGoals((prev) => {
        const toDelete = prev.filter((g) => g.createdAt < startOfToday);

        if (toDelete.length > 0) {
          const newStats = { ...unachievedStats };
          toDelete.forEach((g) => {
            const dKey = dateKeyFrom(g.createdAt);
            newStats[dKey] = (newStats[dKey] || 0) + 1;
          });
          setUnachievedStats(newStats);
        }

        //
        return prev.filter((g) => g.createdAt >= startOfToday);
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
      unachievedStats, // 추가
      setReminderTime,
      clearPreviousDaysGoals, // 수정됨
      loadSettings,
      addGoal,
      completeGoal,
      removeGoal: (id) => setGoals((prev) => prev.filter((g) => g.id !== id)),
      updateRecord: (id, patch = {}) => {
        setRecords((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
        );
      },
      removeRecord: (id) =>
        setRecords((prev) => prev.filter((r) => r.id !== id)),
      clearAll: () => {
        setGoals([]);
        setRecords([]);
        setUnachievedStats({});
      },
      setGoals,
      setRecords,
    };
  }, [goals, records, reminderTime, unachievedStats]);

  return <GoalsCtx.Provider value={api}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const v = useContext(GoalsCtx);
  if (!v) throw new Error("useGoals must be used within <GoalsProvider>");
  return v;
}
