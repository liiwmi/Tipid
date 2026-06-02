import { useEffect, useState, useCallback } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { Appliance } from '../types/appliance';
import { ELECTRICITY_RATE, DAILY_KWH_LIMIT } from '../constants/electricity';

const APPLIANCES_CACHE_KEY = '@appliances_cache';
const PENDING_QUEUE_KEY = '@pending_appliances';

export function useAppliances() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // ─── NETWORK CHECK ───────────────────────────────────────
  async function checkOnline(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
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
    const queue = await getPendingQueue();
    if (queue.length === 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const failed: Omit<Appliance, 'id' | 'created_at'>[] = [];

    for (const item of queue) {
      const { error } = await supabase.from('appliances').insert({
        ...item,
        user_id: user.id,
      });
      if (error) failed.push(item);
    }

    await savePendingQueue(failed);
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

  // ─── COMPUTED VALUES ─────────────────────────────────────
  const activeAppliances = appliances.filter((a) => a.is_active);

  const calculateItemCost = (watts: number, hours: number) =>
    ((watts * hours) / 1000) * ELECTRICITY_RATE;

  const totalDailyKwh = appliances.reduce(
    (total, item) => total + (item.watts * item.hours_per_day) / 1000, 0
  );

  const totalDailyCost = appliances.reduce(
    (total, item) => total + calculateItemCost(item.watts, item.hours_per_day), 0
  );

  const progressWidth = Math.min((totalDailyKwh / DAILY_KWH_LIMIT) * 100, 100);

  return {
    appliances,
    activeAppliances,
    loading,
    isOnline,
    totalDailyKwh,
    totalDailyCost,
    progressWidth,
    addAppliance,
    refresh: loadAppliances,
  };
}