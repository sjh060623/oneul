// app/geoBackground.js
// 백그라운드/종료 상태에서도 지오펜스(ENTER/EXIT)로 알림
// - home 1개 + (좌표 목표들) 여러개 등록
// - iOS는 지오펜스 region 수가 제한(보통 20개)이 있으니 목표가 많으면 일부만 등록해야 함

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

export const GEOFENCE_TASK = "HOME_GEOFENCE_TASK_V1";
const GOALS_KEY = "GOALS_V1";
const GEOFENCE_STATE_KEY = "GEOFENCE_STATE_V1"; // { home: true/false, goals: { [goalId]: true/false } }

// iOS 알림
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
    if (!Array.isArray(arr)) return;

    const idStr = String(goalId);
    const next = arr.filter((g) => String(g?.id) !== idStr);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
  } catch {}
}

async function ensureNotifPerm() {
  const perm = await Notifications.getPermissionsAsync();
  const ok =
    perm.granted ||
    perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  if (ok) return true;

  const req = await Notifications.requestPermissionsAsync();
  return (
    req.granted ||
    req.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
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
  if (!id) return { kind: "unknown", id: "unknown" };

  if (id === "home") return { kind: "home", id: "home" };

  // goal:<goalId>
  if (id.startsWith("goal:")) {
    const goalId = id.slice("goal:".length);
    return { kind: "goal", id: goalId || id };
  }

  return { kind: "unknown", id };
}

async function getGoalNameById(goalId) {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return null;
    const found = arr.find((g) => String(g?.id) === String(goalId));
    const name = String(found?.text || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

async function getGeofenceState() {
  try {
    const raw = await AsyncStorage.getItem(GEOFENCE_STATE_KEY);
    const v = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== "object") return { home: null, goals: {} };
    return {
      home: typeof v.home === "boolean" ? v.home : null,
      goals: v.goals && typeof v.goals === "object" ? v.goals : {},
    };
  } catch {
    return { home: null, goals: {} };
  }
}

async function setGeofenceState(next) {
  try {
    await AsyncStorage.setItem(GEOFENCE_STATE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;

  const eventType = data?.eventType;
  const region = data?.region;
  if (!region) return;

  const parsed = parseRegion(region);

  if (withinCooldown(`${parsed.kind}:${parsed.id}:${eventType}`)) return;

  const notifOk = await ensureNotifPerm();
  if (!notifOk) return;

  const state = await getGeofenceState();

  // 집
  if (parsed.kind === "home") {
    const prev = state.home; // true/false/null
    const next =
      eventType === Location.GeofencingEventType.Enter
        ? true
        : eventType === Location.GeofencingEventType.Exit
        ? false
        : prev;

    if (prev === null) {
      await setGeofenceState({ ...state, home: next });
      return;
    }

    if (prev === next) return;

    // 상태 저장
    await setGeofenceState({ ...state, home: next });

    // 변화 순간에만 알림
    if (next === false) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "출발!",
          body: "집을 벗어났어요. 힘차게 출발했네요!",
        },
        trigger: null,
      });
    } else if (next === true) {
      await Notifications.scheduleNotificationAsync({
        content: { title: "도착!", body: "집 근처에 들어왔어요." },
        trigger: null,
      });
    }
    return;
  }

  // 목표
  if (parsed.kind === "goal") {
    const goalId = String(parsed.id);
    const prev = state.goals?.[goalId]; // true/false/undefined

    const isEnter = eventType === Location.GeofencingEventType.Enter;
    const isExit = eventType === Location.GeofencingEventType.Exit;

    if (prev === undefined) {
      const nextGoals = {
        ...(state.goals || {}),
        [goalId]: isEnter ? true : isExit ? false : false,
      };
      await setGeofenceState({ ...state, goals: nextGoals });
      return;
    }

    if (isEnter) {
      if (prev === true) return;

      const goalName = await getGoalNameById(goalId);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: goalName,
          body: "저장한 목표 위치에 가까워졌어요.",
        },
        trigger: null,
      });
      await removeGoalById(goalId);

      const nextGoals = { ...(state.goals || {}), [goalId]: true };
      await setGeofenceState({ ...state, goals: nextGoals });
      return;
    }

    if (isExit) {
      const nextGoals = { ...(state.goals || {}), [goalId]: false };
      await setGeofenceState({ ...state, goals: nextGoals });
      return;
    }

    return;
  }
});

export async function isHomeGeofenceRunning() {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  } catch {
    return false;
  }
}

async function ensureLocationPerms() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("FG_DENIED");

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") throw new Error("BG_DENIED");
}

function cleanCoord(c) {
  if (!c) return null;
  const latitude = Number(c.latitude);
  const longitude = Number(c.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

export async function stopHomeGeofence() {
  const started = await isHomeGeofenceRunning();
  if (started) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}

//  집만 등록
export async function startHomeGeofence({ latitude, longitude, radiusM = 80 }) {
  const notifOk = await ensureNotifPerm();
  if (!notifOk) throw new Error("NOTIF_DENIED");

  await ensureLocationPerms();

  const started = await isHomeGeofenceRunning();
  if (started) {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    } catch {
      // ignore
    }
  }

  const home = cleanCoord({ latitude, longitude });
  if (!home) throw new Error("HOME_INVALID");

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: "home",
      latitude: home.latitude,
      longitude: home.longitude,
      radius: radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}
// goals: [{ id, coord:{latitude,longitude} }]
export async function startHomeAndGoalsGeofence({
  home,
  homeRadiusM = 50,
  goals = [],
  goalRadiusM = 120,
  maxGoals = 15,
} = {}) {
  const notifOk = await ensureNotifPerm();
  if (!notifOk) throw new Error("NOTIF_DENIED");

  await ensureLocationPerms();

  const started = await isHomeGeofenceRunning();
  if (started) {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    } catch {
      // ignore
    }
  }

  const hc = cleanCoord(home);
  if (!hc) throw new Error("HOME_INVALID");

  const regions = [];

  // home
  regions.push({
    identifier: "home",
    latitude: hc.latitude,
    longitude: hc.longitude,
    radius: homeRadiusM,
    notifyOnEnter: true,
    notifyOnExit: true,
  });

  // goals
  const picked = (goals || [])
    .map((g) => ({ id: String(g.id), coord: cleanCoord(g.coord) }))
    .filter((g) => g.id && g.coord)
    .slice(0, maxGoals);

  for (const g of picked) {
    regions.push({
      identifier: `goal:${g.id}`,
      latitude: g.coord.latitude,
      longitude: g.coord.longitude,
      radius: Math.max(goalRadiusM, 100),
      notifyOnEnter: true,
      notifyOnExit: true,
    });
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}
