import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const PROJECTED_KEY = "@tipid_quota_projected_completion";

interface QuotaProjection {
  projectedMinutesRemaining: number | null;
  projectedCompletionTime: Date | null;
  totalActiveKw: number;
  recalculate: (
    totalDailyKwh: number,
    dailyQuota: number,
    activeAppliances: { watts: number; is_active: boolean }[],
  ) => Promise<void>;
  initPeriod: (totalDailyKwh: number) => Promise<void>;
}

export function useQuotaProjection(): QuotaProjection {
  const [projectedMinutesRemaining, setProjectedMinutesRemaining] = useState<
    number | null
  >(null);
  const [projectedCompletionTime, setProjectedCompletionTime] =
    useState<Date | null>(null);
  const [totalActiveKw, setTotalActiveKw] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeRef = useRef<Date | null>(null);

  // Tick every second to count down from the stored completion time
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!completionTimeRef.current) return;
      const msRemaining = completionTimeRef.current.getTime() - Date.now();
      if (msRemaining <= 0) {
        setProjectedMinutesRemaining(0);
      } else {
        setProjectedMinutesRemaining(msRemaining / 60_000);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // On mount, restore persisted completion time so timer survives reloads
  const initPeriod = useCallback(async (totalDailyKwh: number) => {
    try {
      const stored = await AsyncStorage.getItem(PROJECTED_KEY);
      if (stored) {
        const storedDate = new Date(stored);
        if (storedDate.getTime() > Date.now()) {
          completionTimeRef.current = storedDate;
          setProjectedCompletionTime(storedDate);
          const msRemaining = storedDate.getTime() - Date.now();
          setProjectedMinutesRemaining(msRemaining / 60_000);
        }
      }
    } catch {}
  }, []);

  // Recalculate using instantaneous power draw formula
  const recalculate = useCallback(
    async (
      totalDailyKwh: number,
      dailyQuota: number,
      activeAppliances: { watts: number; is_active: boolean }[],
    ) => {
      try {
        const totalActiveWatts = activeAppliances
          .filter((a) => a.is_active)
          .reduce((sum, a) => sum + a.watts, 0);

        const totalActiveKwVal = totalActiveWatts / 1000;
        setTotalActiveKw(totalActiveKwVal);

        const remainingKwh = dailyQuota - totalDailyKwh;

        if (remainingKwh <= 0) {
          // Quota already exceeded — show how long ago it was hit
          // and continue tracking but set minutes to 0
          setProjectedMinutesRemaining(0);
          setProjectedCompletionTime(new Date());
          completionTimeRef.current = new Date();
          await AsyncStorage.setItem(PROJECTED_KEY, new Date().toISOString());
        }

        if (totalActiveKwVal <= 0) {
          setProjectedMinutesRemaining(null);
          setProjectedCompletionTime(null);
          completionTimeRef.current = null;
          return;
        }

        if (remainingKwh > 0) {
          const hoursRemaining = remainingKwh / totalActiveKwVal;
          const msRemaining = hoursRemaining * 60 * 60 * 1000;
          const completionTime = new Date(Date.now() + msRemaining);

          completionTimeRef.current = completionTime;
          setProjectedMinutesRemaining(msRemaining / 60_000);
          setProjectedCompletionTime(completionTime);

          await AsyncStorage.setItem(
            PROJECTED_KEY,
            completionTime.toISOString(),
          );
        }

        // Core formula: time = remaining energy / power draw
        const hoursRemaining = remainingKwh / totalActiveKwVal;
        const msRemaining = hoursRemaining * 60 * 60 * 1000;
        const completionTime = new Date(Date.now() + msRemaining);

        completionTimeRef.current = completionTime;
        setProjectedMinutesRemaining(msRemaining / 60_000);
        setProjectedCompletionTime(completionTime);

        // Persist so it survives reloads
        await AsyncStorage.setItem(PROJECTED_KEY, completionTime.toISOString());
      } catch {}
    },
    [],
  );

  return {
    projectedMinutesRemaining,
    projectedCompletionTime,
    totalActiveKw,
    recalculate,
    initPeriod,
  };
}
