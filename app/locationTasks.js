import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

export const GEOFENCE_TASK = "GEOFENCE_HOME_TASK";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function notifyOnce(key, title, body, cooldownMs) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) return;

  const { eventType, region } = data;

  // 1=enter, 2=exit
  if (eventType === 2) {
    await notifyOnce(
      "exit",
      "출발!",
      `${region.identifier}을(를) 벗어났어요. 힘차게 출발했네요!`,
      5000
    );
  }

  if (eventType === 1) {
    await notifyOnce(
      "enter",
      "도착!",
      `${region.identifier} 근처에 도착했어요.`,
      5000
    );
  }
});
