// app/geoBackground.js
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

export const GEOFENCE_TASK = "HOME_GEOFENCE_TASK_V1";

// iOS 알림
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

// 너무 자주 울리는 것 방지
let lastFire = 0;
const COOLDOWN_MS = 5000;
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;

  const eventType = data?.eventType;
  const region = data?.region;
  if (!region) return;

  const now = Date.now();
  if (now - lastFire < COOLDOWN_MS) return;
  lastFire = now;

  const notifOk = await ensureNotifPerm();
  if (!notifOk) return;

  if (eventType === Location.GeofencingEventType.Exit) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "출발!",
        body: "집을 벗어났어요. 힘차게 출발했네요!",
      },
      trigger: null,
    });
  } else if (eventType === Location.GeofencingEventType.Enter) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "도착!",
        body: "집 근처에 들어왔어요.",
      },
      trigger: null,
    });
  }
});

export async function isHomeGeofenceRunning() {
  try {
    return await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  } catch {
    return false;
  }
}

export async function startHomeGeofence({ latitude, longitude, radiusM = 80 }) {
  // 1) 알림 권한
  const notifOk = await ensureNotifPerm();
  if (!notifOk) throw new Error("NOTIF_DENIED");

  // 2) 위치 권한
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") throw new Error("FG_DENIED");

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== "granted") throw new Error("BG_DENIED");

  const started = await isHomeGeofenceRunning();
  if (started) {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    } catch {
      // ignore
    }
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: "home",
      latitude,
      longitude,
      radius: radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
}

export async function stopHomeGeofence() {
  const started = await isHomeGeofenceRunning();
  if (started) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}
