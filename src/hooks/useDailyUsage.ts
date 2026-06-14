import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const HISTORY_KEY = '@tipid_daily_history';
const MAX_DAYS = 7;

export interface DayUsage {
  day: string;       // display label e.g. "M", "T"
  date: string;      // ISO date string e.g. "2025-06-14"
  value: number;     // kWh consumed that day
  isToday: boolean;
}

interface DailyRecord {
  date: string;      // "YYYY-MM-DD"
  kwh: number;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_LABELS[d.getDay()];
}

async function loadHistory(): Promise<DailyRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveHistory(history: DailyRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

async function upsertToday(kwh: number): Promise<DailyRecord[]> {
  const today = getTodayString();
  const history = await loadHistory();
  const idx = history.findIndex((r) => r.date === today);

  if (idx >= 0) {
    // Update today's record — always overwrite with latest value
    history[idx].kwh = kwh;
  } else {
    // New day — add record
    history.push({ date: today, kwh });
  }

  // Keep only last 30 days to avoid unbounded growth
  const trimmed = history
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  await saveHistory(trimmed);
  return trimmed;
}

function buildLast7Days(history: DailyRecord[]): DayUsage[] {
  const today = getTodayString();
  const result: DayUsage[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const record = history.find((r) => r.date === dateStr);

    result.push({
      day: getDayLabel(dateStr),
      date: dateStr,
      value: record?.kwh ?? 0,
      isToday: dateStr === today,
    });
  }

  return result;
}

export function useDailyUsage(totalDailyKwh: number): DayUsage[] {
  const [weeklyData, setWeeklyData] = useState<DayUsage[]>([]);

  // On mount — load persisted history immediately
  useEffect(() => {
    (async () => {
      const history = await loadHistory();
      setWeeklyData(buildLast7Days(history));
    })();
  }, []);

  // Whenever totalDailyKwh changes — persist today's value
  useEffect(() => {
    if (totalDailyKwh <= 0) return;

    (async () => {
      const history = await upsertToday(totalDailyKwh);
      setWeeklyData(buildLast7Days(history));
    })();
  }, [totalDailyKwh]);

  return weeklyData;
}