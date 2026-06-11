import { useEffect, useState, useCallback } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Appliance } from '../types/appliance';
import NetInfo from '@react-native-community/netinfo';
import { useSettings } from '../context/SettingsContext';

const APPLIANCES_CACHE_KEY = '@appliances_cache';
const PENDING_QUEUE_KEY = '@pending_appliances';
const PENDING_DELETES_KEY = '@pending_deletes';

export function useAppliances() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const { electricityRate, dailyQuota } = useSettings();

  // ─── NETWORK CHECK ───────────────────────────────────────
    async function checkOnline(): Promise<boolean> {
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.isInternetReachable === true;
    }

  // ─── CACHE ───────────────────────────────────────────────
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

  // ─── PENDING QUEUE ───────────────────────────────────────
  async function getPendingQueue(): Promise<Omit<Appliance, 'id' | 'created_at'>[]> {
    try {
      const pending = await AsyncStorage.getItem(PENDING_QUEUE_KEY);
      return pending ? JSON.parse(pending) : [];
    } catch (_) {
      return [];
    }
  }

  async function savePendingQueue(queue: Omit<Appliance, 'id' | 'created_at'>[]) {
    await AsyncStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(queue));
  }

  // ─── SYNC PENDING ────────────────────────────────────────
 async function syncPending() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Sync pending inserts
  const queue = await getPendingQueue();
  const failed: Omit<Appliance, 'id' | 'created_at'>[] = [];
  for (const item of queue) {
    const { error } = await supabase.from('appliances').insert({
      ...item,
      user_id: user.id,
    });
    if (error) failed.push(item);
  }
  await savePendingQueue(failed);

  // Sync pending deletes
  const deletes = await getPendingDeletes();
  const failedDeletes: string[] = [];
  for (const id of deletes) {
    const { error } = await supabase.from('appliances').delete().eq('id', id);
    if (error) failedDeletes.push(id);
  }
  await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(failedDeletes));

  await fetchFromServer();
}

  // ─── FETCH FROM SERVER ───────────────────────────────────
  async function fetchFromServer() {
    const { data, error } = await supabase
      .from('appliances')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return;

    setAppliances(data || []);
    await saveCache(data || []);
  }

  // ─── LOAD (cache first, then server) ─────────────────────
  const loadAppliances = useCallback(async () => {
    setLoading(true);

    const cached = await loadCache();
    if (cached.length > 0) setAppliances(cached);

    const online = await checkOnline();
    setIsOnline(online);

    if (online) {
      await syncPending();
      await fetchFromServer();
    }

    setLoading(false);
  }, []);

  // ─── APP STATE LISTENER (sync when app comes to foreground) ──
  useEffect(() => {
    loadAppliances();

    const subscription = AppState.addEventListener(
      'change',
      async (state: AppStateStatus) => {
        if (state === 'active') {
          const online = await checkOnline();
          setIsOnline(online);
          if (online) {
            await syncPending();
            await fetchFromServer();
          }
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // ─── ADD APPLIANCE ────────────────────────────────────────
  async function addAppliance(appliance: Omit<Appliance, 'id' | 'created_at' | 'user_id'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Alert.alert('Error', 'Not authenticated.');

    const online = await checkOnline();
    setIsOnline(online);

    if (online) {
      const { error } = await supabase.from('appliances').insert({
        ...appliance,
        user_id: user.id,
      });
      if (error) { Alert.alert('Error', error.message); return; }
      await fetchFromServer();
    } else {
      // save to pending queue
      const queue = await getPendingQueue();
      queue.push({ ...appliance, user_id: user.id });
      await savePendingQueue(queue);

      // optimistically update local state
      const tempAppliance: Appliance = {
        ...appliance,
        id: `temp_${Date.now()}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };
      const updated = [tempAppliance, ...appliances];
      setAppliances(updated);
      await saveCache(updated);

      Alert.alert(
        'Saved Offline',
        'This appliance will sync automatically when you are back online.'
      );
    }
  }

  // ─── DELETE APPLIANCE ─────────────────────────────────────

async function getPendingDeletes(): Promise<string[]> {
  try {
    const val = await AsyncStorage.getItem(PENDING_DELETES_KEY);
    return val ? JSON.parse(val) : [];
  } catch { return []; }
}

async function deleteAppliance(id: string) {
  // Remove from local state immediately
  const updated = appliances.filter((a) => a.id !== id);
  setAppliances(updated);
  await saveCache(updated);

  // If temp (offline-created), just remove from pending queue too
  if (id.startsWith('temp_')) {
    const queue = await getPendingQueue();
    const filtered = queue.filter((_, i) => `temp_${i}` !== id);
    await savePendingQueue(filtered);
    return;
  }

  const online = await checkOnline();
  if (online) {
    await supabase.from('appliances').delete().eq('id', id);
  } else {
    // Queue the delete for later
    const deletes = await getPendingDeletes();
    deletes.push(id);
    await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(deletes));
  }
}

// ─── TOGGLE ACTIVE ────────────────────────────────────────
async function toggleActive(id: string) {
  const appliance = appliances.find((a) => a.id === id);
  if (!appliance) return;

  const updated = appliances.map((a) =>
    a.id === id ? { ...a, is_active: !a.is_active } : a
  );
  setAppliances(updated);
  await saveCache(updated);

  const online = await checkOnline();
  if (online && !id.startsWith('temp_')) {
    await supabase
      .from('appliances')
      .update({ is_active: !appliance.is_active })
      .eq('id', id);
  }
}

  // ─── COMPUTED VALUES ─────────────────────────────────────
  const activeAppliances = appliances.filter((a) => a.is_active);

 const calculateItemCost = (watts: number, hours: number) =>
  ((watts * hours) / 1000) * electricityRate;

const totalDailyKwh = appliances.reduce(
  (total, item) => total + (item.watts * item.hours_per_day) / 1000, 0
);

const totalDailyCost = appliances.reduce(
  (total, item) => total + calculateItemCost(item.watts, item.hours_per_day), 0
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
    deleteAppliance,
    toggleActive,
    refresh: loadAppliances,
  };
}