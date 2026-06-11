import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@tipid_usage_';

function getTodayKey() {
  return PREFIX + new Date().toISOString().split('T')[0]; // e.g. @tipid_usage_2026-06-12
}

function getLast7Keys(): { key: string; day: string; date: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    result.push({
      key: PREFIX + dateStr,
      day: days[d.getDay()],
      date: dateStr,
    });
  }
  return result;
}

export interface DayUsage {
  day: string;
  value: number;   // kWh
  isToday: boolean;
}

export function useDailyUsage(totalDailyKwh: number) {
  const [weeklyUsage, setWeeklyUsage] = useState<DayUsage[]>([]);

  // ── SAVE TODAY'S SNAPSHOT ─────────────────────────────────
  useEffect(() => {
    if (totalDailyKwh <= 0) return;
    const save = async () => {
      try {
        await AsyncStorage.setItem(getTodayKey(), String(totalDailyKwh));
      } catch (_) {}
    };
    save();
  }, [totalDailyKwh]);

  // ── LOAD LAST 7 DAYS ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const keys = getLast7Keys();
        const todayDate = new Date().toISOString().split('T')[0];
        const pairs = await AsyncStorage.multiGet(keys.map((k) => k.key));

        const data: DayUsage[] = keys.map((k, i) => ({
          day: k.day,
          value: pairs[i][1] ? parseFloat(pairs[i][1]) : 0,
          isToday: k.date === todayDate,
        }));

        setWeeklyUsage(data);
      } catch (_) {}
    };
    load();
  }, [totalDailyKwh]);

  return weeklyUsage;
}