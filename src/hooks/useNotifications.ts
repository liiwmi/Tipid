import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appliance } from '../types/appliance';

const NOTIFICATIONS_KEY = '@tipid_notifications';

export type NotificationType = 'quota_exceeded' | 'quota_warning' | 'peak_reminder' | 'offline_pending';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

export function useNotifications(
  appliances: Appliance[],
  totalDailyKwh: number,
  dailyQuota: number,
) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // ── LOAD FROM STORAGE ─────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) setNotifications(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // ── SAVE TO STORAGE ───────────────────────────────────────
  const saveNotifications = async (data: AppNotification[]) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data));
    } catch (_) {}
  };

  // ── GENERATE NOTIFICATIONS ────────────────────────────────
  const generateNotifications = useCallback(async () => {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    const existing: AppNotification[] = stored ? JSON.parse(stored) : [];

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const newNotifs: AppNotification[] = [...existing];

    const addIfNotExists = (notif: AppNotification) => {
      // Deduplicate by type + day so we don't spam
      const today = now.toISOString().split('T')[0];
      const alreadyExists = newNotifs.some(
        (n) => n.type === notif.type && n.timestamp.startsWith(today)
      );
      if (!alreadyExists) newNotifs.unshift(notif);
    };

    // 1. QUOTA EXCEEDED
    if (totalDailyKwh >= dailyQuota) {
      addIfNotExists({
        id: `quota_exceeded_${Date.now()}`,
        type: 'quota_exceeded',
        title: '⚡ Quota Exceeded',
        message: `You've used ${totalDailyKwh.toFixed(2)} kWh — over your ${dailyQuota.toFixed(1)} kWh daily limit.`,
        timestamp: now.toISOString(),
        read: false,
      });
    }

    // 2. 90% QUOTA WARNING
    const pct = (totalDailyKwh / dailyQuota) * 100;
    if (pct >= 90 && pct < 100) {
      // Find low priority appliances to prune
      const lowPriority = appliances
        .filter((a) => a.is_active && a.priority === 'low')
        .sort((a, b) => (a.watts * a.hours_per_day) - (b.watts * b.hours_per_day))
        .slice(0, 3);

      const pruneNames = lowPriority.map((a) => a.name).join(', ');
      const pruneMsg = lowPriority.length > 0
        ? ` Consider turning off: ${pruneNames}.`
        : ' Consider reducing usage of low priority appliances.';

      addIfNotExists({
        id: `quota_warning_${Date.now()}`,
        type: 'quota_warning',
        title: '⚠️ Approaching Quota',
        message: `You've used ${pct.toFixed(0)}% of your daily quota.${pruneMsg}`,
        timestamp: now.toISOString(),
        read: false,
        data: { pruneIds: lowPriority.map((a) => a.id) },
      });
    }

    // 3. PEAK HOUR REMINDER (within 30 minutes of peak start)
    const peakAppliances = appliances.filter((a) => a.peak_start && a.peak_end);
    for (const a of peakAppliances) {
      const [startH, startM] = a.peak_start!.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const nowTotal = currentHour * 60 + currentMinutes;
      const diff = startTotal - nowTotal;

      if (diff > 0 && diff <= 30) {
        const today = now.toISOString().split('T')[0];
        const alreadyExists = newNotifs.some(
          (n) =>
            n.type === 'peak_reminder' &&
            n.timestamp.startsWith(today) &&
            n.data?.applianceId === a.id
        );
        if (!alreadyExists) {
          newNotifs.unshift({
            id: `peak_reminder_${a.id}_${Date.now()}`,
            type: 'peak_reminder',
            title: '🕐 Peak Hour Soon',
            message: `${a.name} enters peak hours at ${a.peak_start}. Priority will upgrade to High.`,
            timestamp: now.toISOString(),
            read: false,
            data: { applianceId: a.id },
          });
        }
      }
    }

    // 4. OFFLINE PENDING
    try {
      const pendingQueue = await AsyncStorage.getItem('@pending_appliances');
      const pendingDeletes = await AsyncStorage.getItem('@pending_deletes');
      const queueCount = pendingQueue ? JSON.parse(pendingQueue).length : 0;
      const deleteCount = pendingDeletes ? JSON.parse(pendingDeletes).length : 0;
      const total = queueCount + deleteCount;

      if (total > 0) {
        addIfNotExists({
          id: `offline_pending_${Date.now()}`,
          type: 'offline_pending',
          title: '☁️ Pending Sync',
          message: `You have ${total} change${total > 1 ? 's' : ''} waiting to sync when you're back online.`,
          timestamp: now.toISOString(),
          read: false,
        });
      }
    } catch (_) {}

    // Keep only last 30 notifications
    const trimmed = newNotifs.slice(0, 30);
    setNotifications(trimmed);
    await saveNotifications(trimmed);
  }, [appliances, totalDailyKwh, dailyQuota]);

  // ── MARK AS READ ──────────────────────────────────────────
  const markAsRead = async (id: string) => {
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    await saveNotifications(updated);
  };

  const markAllAsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    await saveNotifications(updated);
  };

  const clearAll = async () => {
    setNotifications([]);
    await AsyncStorage.removeItem(NOTIFICATIONS_KEY);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    generateNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}