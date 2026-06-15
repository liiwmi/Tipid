import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ApplianceRecommendation,
  OptimizationResult,
  runOptimization,
  ScheduleEntry,
} from "../services/optimizer";
import { Appliance } from "../types/appliance";

const RECOMMENDATIONS_KEY = "@tipid_recommendations";
const SCHEDULE_KEY = "@tipid_schedule";

interface RecommendationState {
  recommendations: ApplianceRecommendation[];
  schedule: ScheduleEntry[];
  lastRunAt: string | null;
  totalPriorityValue: number;
  runRecommendations: (
    appliances: Appliance[],
    budget: number,
    electricityRate: number,
  ) => Promise<OptimizationResult>;
  clearRecommendations: () => Promise<void>;
}

export function useRecommendations(): RecommendationState {
  const [recommendations, setRecommendations] = useState<
    ApplianceRecommendation[]
  >([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [totalPriorityValue, setTotalPriorityValue] = useState(0);

  // Load persisted recommendations on mount
  useEffect(() => {
    (async () => {
      try {
        const recRaw = await AsyncStorage.getItem(RECOMMENDATIONS_KEY);
        const schRaw = await AsyncStorage.getItem(SCHEDULE_KEY);
        if (recRaw) {
          const parsed = JSON.parse(recRaw);
          setRecommendations(parsed.recommendations ?? []);
          setLastRunAt(parsed.lastRunAt ?? null);
          setTotalPriorityValue(parsed.totalPriorityValue ?? 0);
        }
        if (schRaw) {
          const parsedSchedule = JSON.parse(schRaw);
          const sanitized = (parsedSchedule as ScheduleEntry[]).map((e) => ({
            ...e,
            allowedHours: e.allowedHours ?? 0,
          }));
          setSchedule(sanitized);
        }
      } catch {}
    })();
  }, []);

  const runRecommendations = useCallback(
    async (
      appliances: Appliance[],
      budget: number,
      electricityRate: number,
      currentKwh: number = 0,
    ): Promise<OptimizationResult> => {
      const currentHour = new Date().getHours();
      const result = runOptimization(
        appliances,
        budget,
        electricityRate,
        currentHour,
        currentKwh,
      );

      const now = new Date().toISOString();
      setRecommendations(result.recommendations);
      setSchedule(result.schedule);
      setLastRunAt(now);
      setTotalPriorityValue(result.total_priority_value);

      // Persist
      await AsyncStorage.setItem(
        RECOMMENDATIONS_KEY,
        JSON.stringify({
          recommendations: result.recommendations,
          lastRunAt: now,
          totalPriorityValue: result.total_priority_value,
        }),
      );
      await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(result.schedule));

      return result;
    },
    [],
  );

  const clearRecommendations = useCallback(async () => {
    setRecommendations([]);
    setSchedule([]);
    setLastRunAt(null);
    await AsyncStorage.multiRemove([RECOMMENDATIONS_KEY, SCHEDULE_KEY]);
  }, []);

  return {
    recommendations,
    schedule,
    lastRunAt,
    totalPriorityValue,
    runRecommendations,
    clearRecommendations,
  };
}
