import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Appliance } from "../types/appliance";

const NOTIF_LOG_KEY = "@tipid_notif_log";

// ── SETUP HANDLER ─────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── REQUEST PERMISSION ────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── DEDUP LOG ─────────────────────────────────────────────
async function hasAlreadyFiredToday(key: string): Promise<boolean> {
  try {
    const log = await AsyncStorage.getItem(NOTIF_LOG_KEY);
    const parsed: Record<string, string> = log ? JSON.parse(log) : {};
    const today = new Date().toISOString().split("T")[0];
    return parsed[key] === today;
  } catch {
    return false;
  }
}

async function markFiredToday(key: string): Promise<void> {
  try {
    const log = await AsyncStorage.getItem(NOTIF_LOG_KEY);
    const parsed: Record<string, string> = log ? JSON.parse(log) : {};
    parsed[key] = new Date().toISOString().split("T")[0];
    await AsyncStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(parsed));
  } catch {}
}

async function fire(key: string, title: string, body: string): Promise<void> {
  const alreadyFired = await hasAlreadyFiredToday(key);
  if (alreadyFired) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
  await markFiredToday(key);
}

// ── CHECK ALL CONDITIONS ──────────────────────────────────
export async function checkAndFireNotifications(
  appliances: Appliance[],
  totalDailyKwh: number,
  dailyQuota: number,
  notifQuotaEnabled: boolean = true,
  notifPeakEnabled: boolean = true,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // 1. QUOTA EXCEEDED
  if (notifQuotaEnabled && totalDailyKwh >= dailyQuota) {
    await fire(
      "quota_exceeded",
      "⚡ Daily Quota Exceeded",
      `You've used ${totalDailyKwh.toFixed(2)} kWh — over your ${dailyQuota.toFixed(1)} kWh limit. Consider turning off non-essential appliances.`,
    );
  }

  // 2. 90% QUOTA WARNING
  const pct = (totalDailyKwh / dailyQuota) * 100;
  if (notifQuotaEnabled && pct >= 90 && pct < 100) {
    const lowPriority = appliances
      .filter((a) => a.is_active && a.priority === "low")
      .sort((a, b) => b.watts * b.hours_per_day - a.watts * a.hours_per_day)
      .slice(0, 3);

    const pruneMsg =
      lowPriority.length > 0
        ? `Consider turning off: ${lowPriority.map((a) => a.name).join(", ")}.`
        : "Consider reducing usage of low priority appliances.";

    await fire(
      "quota_warning_90",
      "⚠️ Approaching Daily Quota",
      `You've used ${pct.toFixed(0)}% of your ${dailyQuota.toFixed(1)} kWh quota. ${pruneMsg}`,
    );
  }

  // 3. PEAK HOUR REMINDER (within 30 mins of peak start)
  if (notifPeakEnabled) {
    const peakAppliances = appliances.filter(
      (a) => a.peak_start && a.peak_end && a.is_active,
    );
    for (const a of peakAppliances) {
      const [startH, startM] = a.peak_start!.split(":").map(Number);
      const startTotal = startH * 60 + startM;
      const nowTotal = currentHour * 60 + currentMinutes;
      const diff = startTotal - nowTotal;

      if (diff > 0 && diff <= 30) {
        await fire(
          `peak_reminder_${a.id}`,
          "🕐 Peak Hour Starting Soon",
          `${a.name} enters its peak window at ${a.peak_start}. Priority will upgrade to High.`,
        );
      }
    }
  }

  // 4. OFFLINE PENDING SYNC (always fires regardless of toggles)
  try {
    const pendingQueue = await AsyncStorage.getItem("@pending_appliances");
    const pendingDeletes = await AsyncStorage.getItem("@pending_deletes");
    const queueCount = pendingQueue ? JSON.parse(pendingQueue).length : 0;
    const deleteCount = pendingDeletes ? JSON.parse(pendingDeletes).length : 0;
    const total = queueCount + deleteCount;

    if (total > 0) {
      await fire(
        "offline_pending",
        "☁️ Changes Pending Sync",
        `You have ${total} change${total > 1 ? "s" : ""} waiting to sync when you're back online.`,
      );
    }
  } catch {}
}
