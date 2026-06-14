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

type PendingUpdate = {
  id: string;
  updates: Partial<Appliance>;
  queuedAt: string;
};

export function useAppliances() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { electricityRate, dailyQuota } = useSettings();

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

  // ─── PENDING INSERTS ────────────────────────────────────
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
  // After fetching, apply any pending local updates on top so edits
  // made offline are never overwritten by a stale server response.
  // If the server row was updated more recently than our queued edit,
  // the server wins and the stale local change is dropped (conflict).
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
        // Conflict: server changed after our edit was queued — server wins
        return serverItem;
      }

      return { ...serverItem, ...pending.updates };
    });

    // Drop pending updates that lost a conflict (server was newer)
    const stillValid = pendingUpdates.filter((u) => {
      const serverItem = (data || []).find((s) => s.id === u.id);
      if (!serverItem) return true; // not on server yet, keep
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
  }

  // ─── SYNC PENDING ───────────────────────────────────────
  async function syncPending() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Inserts
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

    // Updates — last-write-wins with conflict logging
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

    // Deletes
    const deletes = await getPendingDeletes();
    const failedDeletes: string[] = [];
    for (const id of deletes) {
      const { error } = await supabase
        .from("appliances")
        .delete()
        .eq("id", id);
      if (error) failedDeletes.push(id);
    }
    await AsyncStorage.setItem(
      PENDING_DELETES_KEY,
      JSON.stringify(failedDeletes),
    );

    await fetchFromServer();
  }

  // ─── LOAD ───────────────────────────────────────────────
  const loadAppliances = useCallback(async () => {
    setLoading(true);

    // 1. Show cache immediately (with pending updates already merged in)
    const cached = await loadCache();
    if (cached.length > 0) setAppliances(cached);

    const online = await checkOnline();
    setIsOnline(online);

    if (online) {
      await syncPending();
      // fetchFromServer is called inside syncPending
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
      // 1. Update local state immediately using ref to avoid stale closure
      const current = appliancesRef.current;
      const updated = current.map((a) =>
        a.id === id ? { ...a, ...updates } : a,
      );
      setAppliances(updated);

      // 2. Persist to cache immediately so reload shows correct data
      await saveCache(updated);

      // 3. Skip Supabase for temp offline items
      if (id.startsWith("temp_")) {
        await queueUpdate(id, updates);
        return;
      }

      // 4. Online vs offline handling
      const online = await checkOnline();
      if (online) {
        const { data, error } = await supabase
          .from("appliances")
          .update(updates)
          .eq("id", id)
          .select();

        if (error || !data || data.length === 0) {
          // Supabase failed or RLS blocked the update — queue for later sync
          await queueUpdate(id, updates);
        }
      } else {
        // Offline — queue for later sync
        await queueUpdate(id, updates);
      }
    },
    [],
  );

  // ─── TOGGLE ACTIVE ──────────────────────────────────────
  const toggleActive = useCallback(
    async (id: string) => {
      const appliance = appliancesRef.current.find((a) => a.id === id);
      if (!appliance) return;
      await updateAppliance(id, { is_active: !appliance.is_active });
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
      await AsyncStorage.setItem(
        PENDING_DELETES_KEY,
        JSON.stringify(deletes),
      );
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

  const progressWidth = Math.min((totalDailyKwh / dailyQuota) * 100, 100);

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