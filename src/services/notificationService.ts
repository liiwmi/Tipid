import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Appliance } from "../types/appliance";
import { runOptimization } from "./optimizer";

const NOTIF_LOG_KEY = "@tipid_notif_log";
const PRUNE_CANDIDATES_KEY = "@tipid_prune_candidates";
const OPT_SESSIONS_KEY = "@tipid_optimization_sessions";
const isExpoGo = Constants.appOwnership === "expo";

// ── DEDUP HELPERS ─────────────────────────────────────────────
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
  if (isExpoGo) return;
  const alreadyFired = await hasAlreadyFiredToday(key);
  if (alreadyFired) return;
  const Notifications = await import("expo-notifications");
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
  await markFiredToday(key);
}

// ── OPTIMIZATION SESSION LOG ──────────────────────────────────
interface OptimizationSession {
  id: string;
  timestamp: string;
  quotaPct: number;
  projectedMinutesRemaining: number | null;
  candidates: string[];
  recommendedOn: string[];
  totalPriorityValue: number;
}

async function appendOptimizationSession(
  session: OptimizationSession,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(OPT_SESSIONS_KEY);
    const sessions: OptimizationSession[] = raw ? JSON.parse(raw) : [];
    sessions.unshift(session);
    const trimmed = sessions.slice(0, 100);
    await AsyncStorage.setItem(OPT_SESSIONS_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ── PERMISSION REQUEST ────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ── PRUNE NOTIFICATION ────────────────────────────────────────
// Called directly after optimization runs, independent of quota thresholds.
// Fires once per hour max (deduped by hour key).
export async function firePruneNotification(
  pruneCandidates: { applianceName: string; estimatedCostSaved: number; estimatedMinutesGained: number }[],
): Promise<void> {
  if (isExpoGo) return;
  if (pruneCandidates.length === 0) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Dedup by hour so it doesn't spam — fires at most once per hour
  const hourKey = `prune_suggestion_${new Date().toISOString().slice(0, 13)}`;
  const alreadyFired = await hasAlreadyFiredToday(hourKey);
  if (alreadyFired) return;

  const top = pruneCandidates.slice(0, 3);
  const names = top.map((c) => c.applianceName).join(", ");
  const totalSavings = top.reduce((sum, c) => sum + c.estimatedCostSaved, 0);
  const totalMinutes = top.reduce((sum, c) => sum + c.estimatedMinutesGained, 0);

  const Notifications = await import("expo-notifications");
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "💡 Tipid Suggests Pruning",
      body: `Turn off ${names} to save ₱${totalSavings.toFixed(2)} and gain ~${Math.round(totalMinutes)} min of quota.`,
      sound: true,
      data: { type: "prune_suggestion", candidates: top },
    },
    trigger: null,
  });

  await markFiredToday(hourKey);
}

// ── MAIN FUNCTION ─────────────────────────────────────────────
export async function checkAndFireNotifications(
  appliances: Appliance[],
  totalDailyKwh: number,
  dailyQuota: number,
  electricityRate: number,
  notifQuotaEnabled: boolean = true,
  notifPeakEnabled: boolean = true,
  projectedMinutesRemaining: number | null = null,
): Promise<void> {
  if (isExpoGo) return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const pct = (totalDailyKwh / dailyQuota) * 100;

  // ── 1. 75% THRESHOLD ─────────────────────────────────────
  if (notifQuotaEnabled && pct >= 75 && pct < 90) {
    const alreadyFired = await hasAlreadyFiredToday("quota_75");

    if (!alreadyFired) {
      const budget = dailyQuota * electricityRate;
      const result = runOptimization(
        appliances,
        budget,
        electricityRate,
        currentHour,
         totalDailyKwh,
      );

      // FIX: match by name not id
      const recommendedSet = new Set(result.turn_on);
      const pruneCandidates = appliances
        .filter((a) => a.is_active && !recommendedSet.has(a.name))
        .slice(0, 3);

      await AsyncStorage.setItem(
        PRUNE_CANDIDATES_KEY,
        JSON.stringify(pruneCandidates),
      );

      const projectedText =
        projectedMinutesRemaining !== null
          ? ` Quota reached in ~${Math.round(projectedMinutesRemaining)} min.`
          : "";

      const richRecs = result.recommendations
        .filter((r) => r.action === "turn_off")
        .slice(0, 3);

      const candidateText =
        richRecs.length > 0
          ? ` Suggestions: ${richRecs
              .map(
                (r) =>
                  `${r.applianceName} (saves ₱${r.estimatedCostSaved.toFixed(2)}, +${Math.round(r.estimatedMinutesGained)}min)`,
              )
              .join(", ")}.`
          : " Check your appliance usage.";

      await appendOptimizationSession({
        id: `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        quotaPct: pct,
        projectedMinutesRemaining,
        candidates: pruneCandidates.map((a) => a.name),
        recommendedOn: result.turn_on,
        totalPriorityValue: result.total_priority_value,
      });

      await fire(
        "quota_75",
        "⚠️ 75% of Daily Quota Used",
        `You've used ${pct.toFixed(0)}% of your ${dailyQuota.toFixed(1)} kWh quota.${projectedText}${candidateText}`,
      );

      // Also fire dedicated prune notification
      await firePruneNotification(richRecs);
    }
  }

  // ── 2. 90% THRESHOLD ─────────────────────────────────────
  if (notifQuotaEnabled && pct >= 90 && pct < 100) {
    const alreadyFired = await hasAlreadyFiredToday("quota_warning_90");

    if (!alreadyFired) {
      const budget = dailyQuota * electricityRate;
      const result = runOptimization(
        appliances,
        budget,
        electricityRate,
        currentHour,
      );

      const richRecs = result.recommendations
        .filter((r) => r.action === "turn_off")
        .slice(0, 3);

      const lowPriority = appliances
        .filter((a) => a.is_active && a.priority === "low")
        .sort((a, b) => b.watts * b.hours_per_day - a.watts * a.hours_per_day)
        .slice(0, 3);

      const pruneMsg =
        richRecs.length > 0
          ? `Consider turning off: ${richRecs.map((r) => r.applianceName).join(", ")}.`
          : lowPriority.length > 0
          ? `Consider turning off: ${lowPriority.map((a) => a.name).join(", ")}.`
          : "Consider reducing usage of low priority appliances.";

      const projectedText =
        projectedMinutesRemaining !== null
          ? ` Quota reached in ~${Math.round(projectedMinutesRemaining)} min.`
          : "";

      await fire(
        "quota_warning_90",
        "🔴 Approaching Daily Quota",
        `You've used ${pct.toFixed(0)}% of your ${dailyQuota.toFixed(1)} kWh quota.${projectedText} ${pruneMsg}`,
      );

      // Also fire dedicated prune notification
      await firePruneNotification(richRecs);
    }
  }

  // ── 3. 100% THRESHOLD ────────────────────────────────────
  if (notifQuotaEnabled && totalDailyKwh >= dailyQuota) {
    const budget = dailyQuota * electricityRate;
    const result = runOptimization(
      appliances,
      budget,
      electricityRate,
      currentHour,
    );

    const richRecs = result.recommendations
      .filter((r) => r.action === "turn_off")
      .slice(0, 3);

    await fire(
      "quota_exceeded",
      "⚡ Daily Quota Exceeded",
      `You've used ${totalDailyKwh.toFixed(2)} kWh — over your ${dailyQuota.toFixed(1)} kWh limit. Turn off non-essential appliances now.`,
    );

    // Always fire prune notification when quota is exceeded (hourly dedup)
    await firePruneNotification(richRecs);
  }

  // ── 4. PEAK HOUR REMINDER ────────────────────────────────
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
          "Peak Hour Starting Soon",
          `${a.name} enters its peak window at ${a.peak_start}. Priority will upgrade to High.`,
        );
      }
    }
  }

  // ── 5. OFFLINE PENDING ───────────────────────────────────
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