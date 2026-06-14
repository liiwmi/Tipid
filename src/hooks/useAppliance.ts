import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";
import { useSettings } from "../context/SettingsContext";
import { supabase } from "../lib/supabase";
import { Appliance } from "../types/appliance";

const APPLIANCES_CACHE_KEY = "@appliances_cache";
const PENDING_QUEUE_KEY = "@pending_appliances";
const PENDING_DELETES_KEY = "@pending_deletes";
const PENDING_UPDATES_KEY = "@pending_updates";
const DAILY_HISTORY_KEY = "@tipid_daily_history";
const QUOTA_START_TS_KEY = "@tipid_quota_start_timestamp";
const QUOTA_START_KWH_KEY = "@tipid_quota_start_kwh";
const QUOTA_PROJECTED_KEY = "@tipid_quota_projected_completion";
const CONFIRMED_PRUNES_KEY = "@tipid_confirmed_prunes";
const PRUNE_CANDIDATES_KEY = "@tipid_prune_candidates";
const NOTIF_LOG_KEY = "@tipid_notif_log";
const PRUNING_HISTORY_KEY = "@tipid_pruning_history";
const ELECTRICITY_RATE_KEY = "@tipid_electricity_rate";

type PendingUpdate = {
  id: string;
  updates: Partial<Appliance>;
  queuedAt: string;
};

type DailyRecord = {
  date: string;
  kwh: number;
};

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── DAILY HISTORY HELPERS ──────────────────────────────────
async function upsertDailyHistory(kwh: number): Promise<void> {
  if (kwh <= 0) return;
  try {
    const today = getTodayString();
    const raw = await AsyncStorage.getItem(DAILY_HISTORY_KEY);
    const history: DailyRecord[] = raw ? JSON.parse(raw) : [];
    const idx = history.findIndex((r) => r.date === today);

    if (idx >= 0) {
      // Always overwrite with latest computed value —
      // this handles the over-100% case correctly
      history[idx].kwh = kwh;
    } else {
      history.push({ date: today, kwh });
    }

    // Keep last 30 days, sorted ascending
    const trimmed = history
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    await AsyncStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function useAppliances() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const {
    electricityRate,
    dailyQuota,
    isLoaded: settingsLoaded,
  } = useSettings();

  const appliancesRef = useRef<Appliance[]>([]);
  useEffect(() => {
    appliancesRef.current = appliances;
  }, [appliances]);

  // ─── NETWORK CHECK ──────────────────────────────────────
  async function checkOnline(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  }

  // ─── CACHE ──────────────────────────────────────────────
  async function saveCache(data: Appliance[]) {
    try {
      await AsyncStorage.setItem(APPLIANCES_CACHE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  async function loadCache(): Promise<Appliance[]> {
    try {
      const cached = await AsyncStorage.getItem(APPLIANCES_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (_) {
      return [];
    }
  }

  async function getPendingQueue(): Promise<
    Omit<Appliance, "id" | "created_at">[]
  > {
    try {
      const val = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      return val ? JSON.parse(val) : [];
    } catch (_) {
      return [];
    }
  }

  async function savePendingQueue(
    queue: Omit<Appliance, "id" | "created_at">[],
  ) {
    await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
  }

  // ─── PENDING UPDATES ────────────────────────────────────
  async function getPendingUpdates(): Promise<PendingUpdate[]> {
    try {
      const val = await AsyncStorage.getItem(PENDING_UPDATES_KEY);
      return val ? JSON.parse(val) : [];
    } catch (_) {
      return [];
    }
  }

  async function savePendingUpdates(queue: PendingUpdate[]) {
    await AsyncStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(queue));
  }

  async function queueUpdate(id: string, updates: Partial<Appliance>) {
    const pending = await getPendingUpdates();
    const idx = pending.findIndex((u) => u.id === id);
    const queuedAt = new Date().toISOString();
    if (idx >= 0) {
      pending[idx] = {
        ...pending[idx],
        updates: { ...pending[idx].updates, ...updates },
        queuedAt,
      };
    } else {
      pending.push({ id, updates, queuedAt });
    }
    await savePendingUpdates(pending);
  }

  // ─── PENDING DELETES ────────────────────────────────────
  async function getPendingDeletes(): Promise<string[]> {
    try {
      const val = await AsyncStorage.getItem(PENDING_DELETES_KEY);
      return val ? JSON.parse(val) : [];
    } catch (_) {
      return [];
    }
  }

  // ─── FETCH FROM SERVER ──────────────────────────────────
  async function fetchFromServer() {
    const { data, error } = await supabase
      .from("appliances")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return;

    const pendingUpdates = await getPendingUpdates();

    const merged = (data || []).map((serverItem) => {
      const pending = pendingUpdates.find((u) => u.id === serverItem.id);
      if (!pending) return serverItem;

      const serverUpdatedAt = serverItem.updated_at
        ? new Date(serverItem.updated_at).getTime()
        : 0;
      const queuedAt = new Date(pending.queuedAt).getTime();

      if (serverUpdatedAt > queuedAt) {
        return serverItem;
      }

      return { ...serverItem, ...pending.updates };
    });

    const stillValid = pendingUpdates.filter((u) => {
      const serverItem = (data || []).find((s) => s.id === u.id);
      if (!serverItem) return true;
      const serverUpdatedAt = serverItem.updated_at
        ? new Date(serverItem.updated_at).getTime()
        : 0;
      return new Date(u.queuedAt).getTime() >= serverUpdatedAt;
    });

    if (stillValid.length !== pendingUpdates.length) {
      await savePendingUpdates(stillValid);
    }

    setAppliances(merged);
    await saveCache(merged);

    // Update history with fresh server data
    const freshKwh = merged.reduce(
      (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
      0,
    );
    await upsertDailyHistory(freshKwh);
  }

  // ─── SYNC PENDING ───────────────────────────────────────
  async function syncPending() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const queue = await getPendingQueue();
    const failedInserts: Omit<Appliance, "id" | "created_at">[] = [];
    for (const item of queue) {
      const { data, error } = await supabase
        .from("appliances")
        .insert({ ...item, user_id: user.id })
        .select();

      if (error || !data || data.length === 0) {
        failedInserts.push(item);
      }
    }
    await savePendingQueue(failedInserts);

    const updates = await getPendingUpdates();
    const failedUpdates: PendingUpdate[] = [];
    for (const entry of updates) {
      const { id, updates: upd, queuedAt } = entry;

      const { data: serverRow } = await supabase
        .from("appliances")
        .select("updated_at")
        .eq("id", id)
        .single();

      if (serverRow?.updated_at) {
        const serverTime = new Date(serverRow.updated_at).getTime();
        const queuedTime = new Date(queuedAt).getTime();
        if (serverTime > queuedTime) {
          console.warn(
            `Conflict on appliance ${id}: server changed after local edit was queued — applying local change anyway`,
          );
        }
      }

      const { error, data } = await supabase
        .from("appliances")
        .update(upd)
        .eq("id", id)
        .select();

      if (error || !data || data.length === 0) {
        failedUpdates.push(entry);
      }
    }
    await savePendingUpdates(failedUpdates);

    const deletes = await getPendingDeletes();
    const failedDeletes: string[] = [];
    for (const id of deletes) {
      const { error } = await supabase.from("appliances").delete().eq("id", id);
      if (error) failedDeletes.push(id);
    }
    await AsyncStorage.setItem(
      PENDING_DELETES_KEY,
      JSON.stringify(failedDeletes),
    );

    await fetchFromServer();
  }

  // ─── DAILY RESET CHECK ──────────────────────────────────
  async function checkDailyReset(): Promise<void> {
    try {
      const tsRaw = await AsyncStorage.getItem(QUOTA_START_TS_KEY);
      if (!tsRaw) return;

      const storedDate = new Date(parseInt(tsRaw, 10))
        .toISOString()
        .split("T")[0];
      const today = getTodayString();

      if (storedDate !== today) {
        await AsyncStorage.multiRemove([
          QUOTA_START_TS_KEY,
          QUOTA_START_KWH_KEY,
          QUOTA_PROJECTED_KEY,
          CONFIRMED_PRUNES_KEY,
          PRUNE_CANDIDATES_KEY,
        ]);

        // Clear only threshold dedups, preserve other notif log entries
        const logRaw = await AsyncStorage.getItem(NOTIF_LOG_KEY);
        if (logRaw) {
          const log = JSON.parse(logRaw);
          delete log["quota_75"];
          delete log["quota_warning_90"];
          delete log["quota_exceeded"];
          await AsyncStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(log));
        }
      }
    } catch {}
  }

  // ─── LOAD ───────────────────────────────────────────────
  const loadAppliances = useCallback(async () => {
    setLoading(true);

    // 1. Check if a new day started and reset quota period if so
    await checkDailyReset();

    // 2. Load cache and show immediately
    const cached = await loadCache();
    if (cached.length > 0) {
      setAppliances(cached);

      // 3. Snapshot today's kWh from the loaded cache
      //    This runs right after setAppliances so cached data is available.
      //    Uses cached array directly (not appliancesRef which hasn't updated yet)
      const cachedKwh = cached.reduce(
        (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
        0,
      );
      await upsertDailyHistory(cachedKwh);
    }

    // 4. Network check and sync
    const online = await checkOnline();
    setIsOnline(online);

    if (online) {
      // fetchFromServer is called inside syncPending and also
      // calls upsertDailyHistory with fresh server data
      await syncPending();
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadAppliances();

    const sub = AppState.addEventListener(
      "change",
      async (state: AppStateStatus) => {
        if (state === "active") {
          const online = await checkOnline();
          setIsOnline(online);
          if (online) await syncPending();
        }
      },
    );

    return () => sub.remove();
  }, []);

  // ─── UPDATE ─────────────────────────────────────────────
  const updateAppliance = useCallback(
    async (id: string, updates: Partial<Appliance>): Promise<void> => {
      const current = appliancesRef.current;
      const updated = current.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      );
      setAppliances(updated);
      await saveCache(updated);

      // Update history whenever appliance state changes
      const updatedKwh = updated.reduce(
        (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
        0,
      );
      await upsertDailyHistory(updatedKwh);

      if (id.startsWith("temp_")) {
        await queueUpdate(id, updates);
        return;
      }

      const online = await checkOnline();
      if (online) {
        const { data, error } = await supabase
          .from("appliances")
          .update(updates)
          .eq("id", id)
          .select();

        if (error || !data || data.length === 0) {
          await queueUpdate(id, updates);
        }
      } else {
        await queueUpdate(id, updates);
      }
    },
    [],
  );

  // ─── RECORD CONFIRMED PRUNE ─────────────────────────────
  async function recordConfirmedPrune(
    appliance: Appliance,
    rate: number,
  ): Promise<void> {
    try {
      const projectedRaw = await AsyncStorage.getItem(QUOTA_PROJECTED_KEY);
      const projectedMsBefore = projectedRaw
        ? new Date(projectedRaw).getTime() - Date.now()
        : null;

      const applianceKw = appliance.watts / 1000;
      const minutesGainedVal =
        projectedMsBefore !== null && projectedMsBefore > 0
          ? projectedMsBefore / 60_000
          : 0;
      const hoursGained = minutesGainedVal / 60;
      const kwhSaved = applianceKw * hoursGained;
      const costSaved = kwhSaved * rate;

      const auditEntry = {
        id: `prune_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: "confirmed_prune",
        applianceId: appliance.id,
        applianceName: appliance.name,
        watts: appliance.watts,
        hoursPerDay: appliance.hours_per_day,
        projectedMinutesBefore: minutesGainedVal,
        kwhSaved,
        costSaved,
        minutesGained: minutesGainedVal,
        userAction: "turned_off",
      };

      // Write to confirmed prunes
      const prunesRaw = await AsyncStorage.getItem(CONFIRMED_PRUNES_KEY);
      const prunes = prunesRaw ? JSON.parse(prunesRaw) : [];
      prunes.unshift(auditEntry);
      await AsyncStorage.setItem(CONFIRMED_PRUNES_KEY, JSON.stringify(prunes));

      // Write to pruning history audit trail (capped at 200)
      const histRaw = await AsyncStorage.getItem(PRUNING_HISTORY_KEY);
      const hist = histRaw ? JSON.parse(histRaw) : [];
      hist.unshift(auditEntry);
      await AsyncStorage.setItem(
        PRUNING_HISTORY_KEY,
        JSON.stringify(hist.slice(0, 200)),
      );

      // Reset quota period anchor to now with the new lower baseline
      await AsyncStorage.setItem(QUOTA_START_TS_KEY, Date.now().toString());
      const newKwh = appliancesRef.current
        .filter((a) => a.is_active && a.id !== appliance.id)
        .reduce((sum, a) => sum + (a.watts * a.hours_per_day) / 1000, 0);
      await AsyncStorage.setItem(QUOTA_START_KWH_KEY, newKwh.toString());
    } catch {}
  }

  // ─── TOGGLE ACTIVE ──────────────────────────────────────
  const toggleActive = useCallback(
    async (id: string) => {
      const appliance = appliancesRef.current.find((a) => a.id === id);
      if (!appliance) return;

      const newActiveState = !appliance.is_active;
      await updateAppliance(id, { is_active: newActiveState });

      // Detect confirmed prune — only when turning OFF
      if (!newActiveState) {
        const candidatesRaw = await AsyncStorage.getItem(PRUNE_CANDIDATES_KEY);
        const candidates: Appliance[] = candidatesRaw
          ? JSON.parse(candidatesRaw)
          : [];
        const wasCandidate = candidates.some((c) => c.id === id);
        if (wasCandidate) {
          const rateRaw = await AsyncStorage.getItem(ELECTRICITY_RATE_KEY);
          const rate = rateRaw ? parseFloat(rateRaw) : 11.5;
          await recordConfirmedPrune(appliance, rate);
        }
      }
    },
    [updateAppliance],
  );

  // ─── ADD ────────────────────────────────────────────────
  async function addAppliance(
    appliance: Omit<Appliance, "id" | "created_at" | "user_id">,
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return Alert.alert("Error", "Not authenticated.");

    const online = await checkOnline();
    setIsOnline(online);

    if (online) {
      const { error } = await supabase
        .from("appliances")
        .insert({ ...appliance, user_id: user.id });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      await fetchFromServer();
    } else {
      const queue = await getPendingQueue();
      queue.push({ ...appliance, user_id: user.id });
      await savePendingQueue(queue);

      const temp: Appliance = {
        ...appliance,
        id: `temp_${Date.now()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      const updated = [temp, ...appliancesRef.current];
      setAppliances(updated);
      await saveCache(updated);

      // Snapshot updated total after offline add
      const newKwh = updated.reduce(
        (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
        0,
      );
      await upsertDailyHistory(newKwh);

      Alert.alert(
        "Saved Offline",
        "This appliance will sync when you are back online.",
      );
    }
  }

  // ─── DELETE ─────────────────────────────────────────────
  async function deleteAppliance(id: string) {
    const updated = appliancesRef.current.filter((a) => a.id !== id);
    setAppliances(updated);
    await saveCache(updated);

    // Snapshot after delete
    const newKwh = updated.reduce(
      (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
      0,
    );
    await upsertDailyHistory(newKwh);

    if (id.startsWith("temp_")) {
      const queue = await getPendingQueue();
      const tempIndex = appliancesRef.current.findIndex((a) => a.id === id);
      if (tempIndex >= 0) {
        queue.splice(tempIndex, 1);
        await savePendingQueue(queue);
      }
      return;
    }

    const online = await checkOnline();
    if (online) {
      await supabase.from("appliances").delete().eq("id", id);
    } else {
      const deletes = await getPendingDeletes();
      deletes.push(id);
      await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(deletes));
    }
  }

  // ─── COMPUTED ───────────────────────────────────────────
  const activeAppliances = appliances.filter((a) => a.is_active);

  const totalDailyKwh = appliances.reduce(
    (total, a) => total + (a.watts * a.hours_per_day) / 1000,
    0,
  );

  const totalDailyCost = appliances.reduce(
    (total, a) =>
      total + ((a.watts * a.hours_per_day) / 1000) * electricityRate,
    0,
  );

  // No Math.min — raw percentage, supports over 100%
  const progressWidth = settingsLoaded ? (totalDailyKwh / dailyQuota) * 100 : 0;

  return {
    appliances,
    activeAppliances,
    loading,
    isOnline,
    totalDailyKwh,
    totalDailyCost,
    progressWidth,
    addAppliance,
    updateAppliance,
    deleteAppliance,
    toggleActive,
    refresh: loadAppliances,
  };
}
