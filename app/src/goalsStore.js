// src/goalsStore.js  (zustand 제거 버전)
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const GoalsContext = createContext(null);

export function GoalsProvider({ children }) {
  const [goals, setGoals] = useState([]); // { id, title, done, createdAt }

  const addGoal = useCallback((title) => {
    const t = String(title || "").trim();
    if (!t) return;
    setGoals((prev) => [
      { id: String(Date.now()), title: t, done: false, createdAt: Date.now() },
      ...prev,
    ]);
  }, []);

  const toggleGoal = useCallback((id) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g))
    );
  }, []);

  const value = useMemo(
    () => ({ goals, addGoal, toggleGoal }),
    [goals, addGoal, toggleGoal]
  );

  return (
    <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>
  );
}

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
