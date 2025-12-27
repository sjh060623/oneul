import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "GOALS_V1";

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const GoalsCtx = createContext(null);

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]);
  const hydratedRef = useRef(false);

  // 앱 시작
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!mounted) return;

        const parsed = raw ? JSON.parse(raw) : [];
        setGoals(Array.isArray(parsed) ? parsed : []);
      } catch {
        if (mounted) setGoals([]);
      } finally {
        hydratedRef.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setGoals(Array.isArray(parsed) ? parsed : []);
      } catch {}
    }, 2000);

    return () => clearInterval(t);
  }, []);

  // goals 변경
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(goals)).catch(() => {});
  }, [goals]);

  const api = useMemo(() => {
    const addGoal = ({ text, type = "todo", coord = null } = {}) => {
      const t = String(text || "").trim();
      if (!t) return;

      const cleanCoord =
        coord &&
        Number.isFinite(Number(coord.latitude)) &&
        Number.isFinite(Number(coord.longitude))
          ? {
              latitude: Number(coord.latitude),
              longitude: Number(coord.longitude),
            }
          : null;

      setGoals((prev) => [
        {
          id: uid(),
          text: t,
          type, // "todo" | "go"
          coord: cleanCoord,
          done: false,
          createdAt: Date.now(),
        },
        ...prev,
      ]);
    };

    const toggleGoal = (id) => {
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
      );
    };

    const removeGoal = (id) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    };

    const clearAll = () => setGoals([]);

    return { goals, addGoal, toggleGoal, removeGoal, clearAll, setGoals };
  }, [goals]);

  return <GoalsCtx.Provider value={api}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const v = useContext(GoalsCtx);
  if (!v) throw new Error("useGoals must be used within <GoalsProvider>");
  return v;
}
