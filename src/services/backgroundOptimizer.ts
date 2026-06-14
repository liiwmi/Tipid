import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runOptimization } from './optimizer';

export const OPTIMIZATION_TASK = 'background-optimization';

TaskManager.defineTask(OPTIMIZATION_TASK, async () => {
  try {
    const appliancesRaw = await AsyncStorage.getItem('@appliances_cache');
    const settingsRaw = await AsyncStorage.getItem('@tipid_settings');

    if (!appliancesRaw || !settingsRaw) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const appliances = JSON.parse(appliancesRaw);
    const settings = JSON.parse(settingsRaw);
    const { electricityRate, dailyQuota } = settings;
    const currentHour = new Date().getHours();

    const result = runOptimization(
      appliances,
      dailyQuota * electricityRate,
      electricityRate,
      currentHour,
    );

    await AsyncStorage.setItem(
      '@last_optimization_result',
      JSON.stringify({ ...result, timestamp: new Date().toISOString() })
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundOptimization() {
  try {
    await BackgroundFetch.registerTaskAsync(OPTIMIZATION_TASK, {
      minimumInterval: 60 * 60, // every hour
      stopOnTerminate: false,   // keep running after app closes
      startOnBoot: true,        // run after phone restarts
    });
    console.log('Background optimization registered');
  } catch (e) {
    console.log('Background fetch registration failed:', e);
  }
}

export async function unregisterBackgroundOptimization() {
  await BackgroundFetch.unregisterTaskAsync(OPTIMIZATION_TASK);
}