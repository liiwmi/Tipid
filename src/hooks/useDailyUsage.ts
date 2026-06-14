import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PREFIX = "@tipid_usage_";

function getTodayKey() {
  return PREFIX + new Date().toISOString().split("T")[0];
}

function getLast7Keys(): { key: string; day: string; date: string }[] {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
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
  value: number;
  isToday: boolean;
}

export function useDailyUsage(totalDailyKwh: number) {
  const [weeklyUsage, setWeeklyUsage] = useState<DayUsage[]>([]);

  // ── SAVE TODAY'S SNAPSHOT ─────────────────────────────────
  useEffect(() => {
    if (totalDailyKwh <= 0) return;
    const save = async () => {
      const todayKey = getTodayKey();
      const todayDate = new Date().toISOString().split("T")[0];

      try {
        await AsyncStorage.setItem(todayKey, String(totalDailyKwh));
      } catch (_) {}

      try {
        const net = await NetInfo.fetch();
        if (net.isConnected && net.isInternetReachable) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const { data, error } = await supabase
              .from("daily_usage")
              .upsert(
                { user_id: user.id, date: todayDate, kwh: totalDailyKwh },
                { onConflict: "user_id,date" },
              );
            console.log("Usage saved to Supabase:", {
              date: todayDate,
              kwh: totalDailyKwh,
            });
            if (error) console.log("Supabase error:", error.message);
          }
        }
      } catch (e) {
        console.log("Save error:", e);
      }
    };
    save();
  }, [totalDailyKwh]);

  // ── LOAD LAST 7 DAYS ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const keys = getLast7Keys();
      const todayDate = new Date().toISOString().split("T")[0];

      // Try Supabase first if online
      try {
        const net = await NetInfo.fetch();
        if (net.isConnected && net.isInternetReachable) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            const dates = keys.map((k) => k.date);
            const { data } = await supabase
              .from("daily_usage")
              .select("date, kwh")
              .eq("user_id", user.id)
              .in("date", dates);

            if (data && data.length > 0) {
              // Cache each day locally
              for (const row of data) {
                await AsyncStorage.setItem(PREFIX + row.date, String(row.kwh));
              }

              const mapped: DayUsage[] = keys.map((k) => {
                const match = data.find((d) => d.date === k.date);
                return {
                  day: k.day,
                  value: match ? parseFloat(match.kwh) : 0,
                  isToday: k.date === todayDate,
                };
              });
              setWeeklyUsage(mapped);
              return;
            }
          }
        }
      } catch (_) {}

      // Fallback to AsyncStorage
      try {
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
