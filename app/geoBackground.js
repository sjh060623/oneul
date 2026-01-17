import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { DeviceEventEmitter } from "react-native";

export const GEOFENCE_TASK = "HOME_GEOFENCE_TASK_V1";
const GOALS_KEY = "GOALS_V1";
const GEOFENCE_STATE_KEY = "GEOFENCE_STATE_V1";
const RECORDS_KEY = "GOAL_RECORDS_V1";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function removeGoalById(goalId) {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const idStr = String(goalId);
    const next = arr.filter((g) => String(g?.id) !== idStr);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
  } catch {}
}

async function ensureNotifPerm() {
  const perm = await Notifications.getPermissionsAsync();
  return (
    perm.granted ||
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    (await Notifications.requestPermissionsAsync()).granted
  );
}

const lastFireById = Object.create(null);
const COOLDOWN_MS = 5000;
function withinCooldown(id) {
  const now = Date.now();
  const last = Number(lastFireById[id] || 0);
  if (now - last < COOLDOWN_MS) return true;
  lastFireById[id] = now;
  return false;
}

function parseRegion(region) {
  const id = String(region?.identifier || "");
  if (id === "home") return { kind: "home", id: "home" };
  if (id.startsWith("goal:"))
    return { kind: "goal", id: id.slice("goal:".length) };
  return { kind: "unknown", id };
}

async function getGoalNameById(goalId) {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    const found = (raw ? JSON.parse(raw) : []).find(
      (g) => String(g?.id) === String(goalId)
    );
    return found ? String(found.text).trim() : null;
  } catch {
    return null;
  }
}

async function getGeofenceState() {
  try {
    const raw = await AsyncStorage.getItem(GEOFENCE_STATE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    return { home: v?.home ?? null, goals: v?.goals ?? {} };
  } catch {
    return { home: null, goals: {} };
  }
}

async function moveGoalToRecordsById(goalId) {
  try {
    const [rawGoals, rawRecs] = await Promise.all([
      AsyncStorage.getItem(GOALS_KEY),
      AsyncStorage.getItem(RECORDS_KEY),
    ]);
    const goals = rawGoals ? JSON.parse(rawGoals) : [];
    const recs = rawRecs ? JSON.parse(rawRecs) : [];
    const idStr = String(goalId);
    const found = goals.find((g) => String(g?.id) === idStr);
    const nextGoals = goals.filter((g) => String(g?.id) !== idStr);
    if (found) {
      const now = Date.now();
      const nextRecs = [
        {
          ...found,
          completedAt: now,
          dateKey: new Date(now).toISOString().split("T")[0],
        },
        ...recs,
      ];
      await Promise.all([
        AsyncStorage.setItem(GOALS_KEY, JSON.stringify(nextGoals)),
        AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(nextRecs)),
      ]);
    }
  } catch {}
}

/** [핵심] TaskManager 정의 **/
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;
  const eventType = data?.eventType;
  const region = data?.region;
  if (!region) return;

  const parsed = parseRegion(region);
  if (withinCooldown(`${parsed.kind}:${parsed.id}:${eventType}`)) return;
  if (!(await ensureNotifPerm())) return;

  const state = await getGeofenceState();

  if (parsed.kind === "home") {
    const next = eventType === Location.GeofencingEventType.Enter;
    if (state.home === next) return;
    await AsyncStorage.setItem(
      GEOFENCE_STATE_KEY,
      JSON.stringify({ ...state, home: next })
    );
    await Notifications.scheduleNotificationAsync({
      content: {
        title: next ? "도착!" : "출발!",
        body: next
          ? "집 근처에 들어왔어요."
          : "집을 벗어났어요. 힘차게 출발했네요!",
      },
      trigger: null,
    });
    return;
  }

  if (
    parsed.kind === "goal" &&
    eventType === Location.GeofencingEventType.Enter
  ) {
    const goalId = String(parsed.id);
    const goalName = await getGoalNameById(goalId);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "목표 달성!",
        body: goalName
          ? `${goalName} 근처에 도착했어요.`
          : "목표 위치 근처에 도착했어요.",
      },
      trigger: null,
    });

    await moveGoalToRecordsById(goalId);
    await removeGoalById(goalId);

    DeviceEventEmitter.emit("REFRESH_GOALS");

    const nextGoals = { ...state.goals, [goalId]: true };
    await AsyncStorage.setItem(
      GEOFENCE_STATE_KEY,
      JSON.stringify({ ...state, goals: nextGoals })
    );
  }
});

/** 외부 사용 함수들 **/
export async function isHomeGeofenceRunning() {
  return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
}

export async function stopHomeGeofence() {
  if (await isHomeGeofenceRunning())
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
}

export async function startHomeAndGoalsGeofence({
  home,
  homeRadiusM = 50,
  goals = [],
  goalRadiusM = 120,
}) {
  await ensureNotifPerm();
  const fg = await Location.requestForegroundPermissionsAsync();
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (fg.status !== "granted" || bg.status !== "granted") return;

  if (await isHomeGeofenceRunning())
    await Location.stopGeofencingAsync(GEOFENCE_TASK);

  const regions = [
    {
      identifier: "home",
      latitude: home.latitude,
      longitude: home.longitude,
      radius: homeRadiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ];
  goals.forEach((g) => {
    if (g.coord)
      regions.push({
        identifier: `goal:${g.id}`,
        latitude: g.coord.latitude,
        longitude: g.coord.longitude,
        radius: Math.max(goalRadiusM, 100),
        notifyOnEnter: true,
      });
  });

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}
