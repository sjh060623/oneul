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
import { AppState } from "react-native";
const ACTIVE_KEY = "GOALS_V1"; // geoBackground.j
const RECORDS_KEY = "GOAL_RECORDS_V1";

const GoalsCtx = createContext(null);

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeGoal(input) {
  const now = Date.now();

  // string
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]); // active(미완료)
  const [records, setRecords] = useState([]); // 완료 기록
  const hydratedRef = useRef(false);

  // boot
  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      try {
        const [rawGoals, rawRecords] = await Promise.all([
          AsyncStorage.getItem(ACTIVE_KEY),
          AsyncStorage.getItem(RECORDS_KEY),
        ]);

        if (!mounted) return;

        const g = rawGoals ? JSON.parse(rawGoals) : [];
        const r = rawRecords ? JSON.parse(rawRecords) : [];

        const goalsArr = Array.isArray(g) ? g : [];
        const recordsArr = Array.isArray(r) ? r : [];

        const nextGoals = [];
        const moved = [];
        for (const item of goalsArr) {
          if (item && item.done === true) {
            moved.push({
              id: String(item.id ?? uid()),
              text: String(item.text ?? item.title ?? "").trim(),
              type: String(item.type ?? "legacy"),
              place: String(item.place ?? ""),
              title: String(item.title ?? ""),
              coord: item.coord ?? null,
              createdAt: Number(item.createdAt ?? Date.now()),
              completedAt: Date.now(),
              dateKey: dateKeyFrom(Date.now()),
              memo: String(item.memo ?? ""),
              photoUri: String(item.photoUri ?? ""),
            });
          } else {
            const ng = normalizeGoal(item);
            if (ng) nextGoals.push(ng);
          }
        }

        const nextRecords = [
          ...moved,
          ...recordsArr.map((x) => ({
            id: String(x.id ?? uid()),
            text: String(x.text ?? "").trim(),
            type: String(x.type ?? "legacy"),
            place: String(x.place ?? ""),
            title: String(x.title ?? ""),
            coord: x.coord ?? null,
            createdAt: Number(x.createdAt ?? Date.now()),
            completedAt: Number(x.completedAt ?? Date.now()),
            dateKey: String(
              x.dateKey ?? dateKeyFrom(x.completedAt ?? Date.now())
            ),
            memo: String(x.memo ?? ""),
            photoUri: String(x.photoUri ?? ""),
          })),
        ].filter((x) => x.text);

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
  const lastGoalsRawRef = useRef(null);
  const lastRecordsRawRef = useRef(null);

  const reloadFromStorage = async () => {
    try {
      const [rawGoals, rawRecords] = await Promise.all([
        AsyncStorage.getItem(ACTIVE_KEY),
        AsyncStorage.getItem(RECORDS_KEY),
      ]);

      if (
        rawGoals === lastGoalsRawRef.current &&
        rawRecords === lastRecordsRawRef.current
      ) {
        return;
      }
      lastGoalsRawRef.current = rawGoals;
      lastRecordsRawRef.current = rawRecords;

      const g = rawGoals ? JSON.parse(rawGoals) : [];
      const r = rawRecords ? JSON.parse(rawRecords) : [];

      const nextGoals = Array.isArray(g)
        ? g.map(normalizeGoal).filter(Boolean)
        : [];
      const nextRecords = Array.isArray(r)
        ? r
            .map((x) => ({
              id: String(x.id ?? uid()),
              text: String(x.text ?? "").trim(),
              type: String(x.type ?? "legacy"),
              place: String(x.place ?? ""),
              title: String(x.title ?? ""),
              coord: x.coord ?? null,
              createdAt: Number(x.createdAt ?? Date.now()),
              completedAt: Number(x.completedAt ?? Date.now()),
              dateKey: String(
                x.dateKey ?? dateKeyFrom(x.completedAt ?? Date.now())
              ),
              memo: String(x.memo ?? ""),
              photoUri: String(x.photoUri ?? ""),
            }))
            .filter((x) => x.text)
        : [];

      setGoals(nextGoals);
      setRecords(nextRecords);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const t = setInterval(() => {
      reloadFromStorage();
    }, 1200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") reloadFromStorage();
    });
    return () => sub.remove();
  }, []);
  // persist
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(goals)).catch(() => {});
  }, [goals]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records)).catch(() => {});
  }, [records]);

  const api = useMemo(() => {
    const addGoal = (goalLike) => {
      const g = normalizeGoal(goalLike);
      if (!g) return;
      setGoals((prev) => [g, ...prev]);
    };

    const completeGoal = (id) => {
      setGoals((prev) => {
        const found = prev.find((g) => g.id === id);
        if (!found) return prev;

        const now = Date.now();
        const rec = {
          id: found.id,
          text: found.text,
          type: found.type,
          place: found.place,
          title: found.title,
          coord: found.coord,
          createdAt: found.createdAt,
          completedAt: now,
          dateKey: dateKeyFrom(now),
          memo: "",
          photoUri: "",
        };

        setRecords((rprev) => [rec, ...rprev]);

        return prev.filter((g) => g.id !== id);
      });
    };

    const removeGoal = (id) => {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    };

    const updateRecord = (id, patch = {}) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                memo: patch.memo !== undefined ? String(patch.memo) : r.memo,
                photoUri:
                  patch.photoUri !== undefined
                    ? String(patch.photoUri || "")
                    : r.photoUri,
              }
            : r
        )
      );
    };

    const removeRecord = (id) => {
      setRecords((prev) => prev.filter((r) => r.id !== id));
    };

    const clearAll = () => {
      setGoals([]);
      setRecords([]);
    };

    return {
      goals,
      records,
      addGoal,
      completeGoal,
      removeGoal,
      updateRecord,
      removeRecord,
      clearAll,
      setGoals,
      setRecords,
    };
  }, [goals, records]);

  return <GoalsCtx.Provider value={api}>{children}</GoalsCtx.Provider>;
}

export function useGoals() {
  const v = useContext(GoalsCtx);
  if (!v) throw new Error("useGoals must be used within <GoalsProvider>");
  return v;
}
