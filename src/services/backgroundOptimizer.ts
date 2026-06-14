import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runOptimization } from './optimizer';

export const OPTIMIZATION_TASK = 'background-optimization';

// ── KEY CONSTANTS (must match SettingsContext) ────────────────
const KEYS = {
  RATE:  '@tipid_electricity_rate',
  QUOTA: '@tipid_daily_quota',
};

TaskManager.defineTask(OPTIMIZATION_TASK, async () => {
  try {
    const appliancesRaw = await AsyncStorage.getItem('@appliances_cache');
    if (!appliancesRaw) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Read individual keys that SettingsContext actually writes
    const [[, rateRaw], [, quotaRaw]] = await AsyncStorage.multiGet([
      KEYS.RATE,
      KEYS.QUOTA,
    ]);

    const electricityRate = rateRaw ? parseFloat(rateRaw) : 11.5;
    const dailyQuota      = quotaRaw ? parseFloat(quotaRaw) : 8.0;

    if (isNaN(electricityRate) || isNaN(dailyQuota)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const appliances  = JSON.parse(appliancesRaw);
    const currentHour = new Date().getHours();
    const budget      = dailyQuota * electricityRate;

    const result = runOptimization(
      appliances,
      budget,
      electricityRate,
      currentHour,
    );

    await AsyncStorage.setItem(
      '@last_optimization_result',
      JSON.stringify({ ...result, timestamp: new Date().toISOString() }),
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    console.error('[BackgroundOptimizer] Task failed:', e);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundOptimization() {
  try {
    // Avoid double-registration
    const isRegistered = await TaskManager.isTaskRegisteredAsync(OPTIMIZATION_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(OPTIMIZATION_TASK, {
      minimumInterval: 60 * 60, // every hour
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('[BackgroundOptimizer] Registered successfully');
  } catch (e) {
    console.warn('[BackgroundOptimizer] Registration failed:', e);
  }
}

export async function unregisterBackgroundOptimization() {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(OPTIMIZATION_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(OPTIMIZATION_TASK);
    }
  } catch (e) {
    console.warn('[BackgroundOptimizer] Unregister failed:', e);
  }
}