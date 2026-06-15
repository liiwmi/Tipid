import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { checkAndFireNotifications } from "./notificationService";
import { runOptimization } from "./optimizer";

export const OPTIMIZATION_TASK = "background-optimization";

const KEYS = {
  RATE: "@tipid_electricity_rate",
  QUOTA: "@tipid_daily_quota",
};

const NOTIF_LOG_KEY = "@tipid_quota_notif_log";

// ── DEDUP: only fire each threshold once per day ──────────────
async function hasNotifiedToday(key: string): Promise<boolean> {
  try {
    const log = await AsyncStorage.getItem(NOTIF_LOG_KEY);
    const parsed: Record<string, string> = log ? JSON.parse(log) : {};
    const today = new Date().toISOString().split("T")[0];
    return parsed[key] === today;
  } catch {
    return false;
  }
}

async function markNotifiedToday(key: string): Promise<void> {
  try {
    const log = await AsyncStorage.getItem(NOTIF_LOG_KEY);
    const parsed: Record<string, string> = log ? JSON.parse(log) : {};
    parsed[key] = new Date().toISOString().split("T")[0];
    await AsyncStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(parsed));
  } catch {}
}

// ── SEND PUSH NOTIFICATION ───────────────────────────────────
async function sendQuotaNotification(
  title: string,
  body: string,
  key: string,
): Promise<void> {
  if (await hasNotifiedToday(key)) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
    await markNotifiedToday(key);
  } catch {}
}

// ── BACKGROUND TASK ──────────────────────────────────────────
TaskManager.defineTask(OPTIMIZATION_TASK, async () => {
  try {
    const appliancesRaw = await AsyncStorage.getItem("@appliances_cache");
    if (!appliancesRaw) return BackgroundFetch.BackgroundFetchResult.NoData;

    const [[, rateRaw], [, quotaRaw]] = await AsyncStorage.multiGet([
      KEYS.RATE,
      KEYS.QUOTA,
    ]);

    const electricityRate = rateRaw ? parseFloat(rateRaw) : 11.5;
    const dailyQuota = quotaRaw ? parseFloat(quotaRaw) : 8.0;

    if (isNaN(electricityRate) || isNaN(dailyQuota)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const appliances = JSON.parse(appliancesRaw);
    const currentHour = new Date().getHours();
    const budget = dailyQuota * electricityRate;

    // ── RUN OPTIMIZATION ─────────────────────────────────────
    const result = runOptimization(
      appliances,
      budget,
      electricityRate,
      currentHour,
    );

    await AsyncStorage.setItem(
      "@last_optimization_result",
      JSON.stringify({ ...result, timestamp: new Date().toISOString() }),
    );

    // ── QUOTA CHECK & PUSH NOTIFICATIONS ─────────────────────
    // Calculate current total kWh from active appliances
    const totalDailyKwh = appliances
      .filter((a: any) => a.is_active)
      .reduce(
        (sum: number, a: any) => sum + (a.watts * a.hours_per_day) / 1000,
        0,
      );

    const pct = (totalDailyKwh / dailyQuota) * 100;

    // Read projected minutes from storage
    const projectedRaw = await AsyncStorage.getItem(
      "@tipid_quota_projected_completion",
    );
    let projectedMinutesRemaining: number | null = null;
    if (projectedRaw) {
      const projectedMs = new Date(projectedRaw).getTime() - Date.now();
      if (projectedMs > 0) {
        projectedMinutesRemaining = projectedMs / 60_000;
      }
    }

    await checkAndFireNotifications(
      appliances,
      totalDailyKwh,
      dailyQuota,
      electricityRate,
      true,
      true,
      projectedMinutesRemaining,
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── REGISTER ─────────────────────────────────────────────────
export async function registerBackgroundOptimization(): Promise<boolean> {
  try {
    // Check notification permission first
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") return false;
    }

    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(OPTIMIZATION_TASK);
    if (isRegistered) return true;

    await BackgroundFetch.registerTaskAsync(OPTIMIZATION_TASK, {
      minimumInterval: 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundOptimization(): Promise<void> {
  try {
    const isRegistered =
      await TaskManager.isTaskRegisteredAsync(OPTIMIZATION_TASK);
    if (isRegistered)
      await BackgroundFetch.unregisterTaskAsync(OPTIMIZATION_TASK);
  } catch {}
}
