import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef } from 'react';
import { Appliance } from '../types/appliance';

const RUNTIME_KEY = '@tipid_runtime_today';

interface RuntimeRecord {
  applianceId: string;
  startedAt: number | null;   // epoch ms when last turned on
  hoursUsed: number;          // accumulated hours today
}

interface RuntimeTracker {
  onApplianceToggled: (
    appliance: Appliance,
    newActiveState: boolean,
    updateAppliance: (id: string, updates: Partial<Appliance>) => Promise<void>,
  ) => Promise<void>;
  checkAutoShutoff: (
    appliances: Appliance[],
    remainingKwh: number,
    updateAppliance: (id: string, updates: Partial<Appliance>) => Promise<void>,
  ) => Promise<string[]>;  // returns ids that were auto shut off
}

async function loadRuntimeRecords(): Promise<RuntimeRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(RUNTIME_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveRuntimeRecords(records: RuntimeRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(RUNTIME_KEY, JSON.stringify(records));
  } catch {}
}

export function useRuntimeTracker(): RuntimeTracker {
  const recordsRef = useRef<RuntimeRecord[]>([]);

  useEffect(() => {
    (async () => {
      recordsRef.current = await loadRuntimeRecords();
    })();
  }, []);

  const onApplianceToggled = useCallback(async (
    appliance: Appliance,
    newActiveState: boolean,
    updateAppliance: (id: string, updates: Partial<Appliance>) => Promise<void>,
  ) => {
    const records = recordsRef.current;
    let record = records.find((r) => r.applianceId === appliance.id);

    if (!record) {
      record = { applianceId: appliance.id, startedAt: null, hoursUsed: 0 };
      records.push(record);
    }

    if (newActiveState) {
      // Turning ON — record start time
      record.startedAt = Date.now();
    } else {
      // Turning OFF — accumulate hours used
      if (record.startedAt !== null) {
        const elapsedMs = Date.now() - record.startedAt;
        const elapsedHours = elapsedMs / 3_600_000;
        record.hoursUsed = Math.min(
          record.hoursUsed + elapsedHours,
          appliance.max_runtime_hours ?? appliance.hours_per_day,
        );
        record.startedAt = null;

        // Persist runtime_used_today back to the appliance
        await updateAppliance(appliance.id, {
          runtime_used_today: parseFloat(record.hoursUsed.toFixed(4)),
        });
      }
    }

    recordsRef.current = records;
    await saveRuntimeRecords(records);
  }, []);

  const checkAutoShutoff = useCallback(async (
    appliances: Appliance[],
    remainingKwh: number,
    updateAppliance: (id: string, updates: Partial<Appliance>) => Promise<void>,
  ): Promise<string[]> => {
    const shutoffIds: string[] = [];
    const records = recordsRef.current;

    for (const a of appliances) {
      if (!a.is_active) continue;

      const record = records.find((r) => r.applianceId === a.id);
      const currentHoursUsed = record?.startedAt
        ? record.hoursUsed + (Date.now() - record.startedAt) / 3_600_000
        : record?.hoursUsed ?? 0;

      // Check max runtime exceeded
      if (
        a.max_runtime_hours !== null &&
        currentHoursUsed >= a.max_runtime_hours
      ) {
        await updateAppliance(a.id, {
          is_active: false,
          runtime_used_today: parseFloat(currentHoursUsed.toFixed(4)),
        });
        shutoffIds.push(a.id);
        continue;
      }

      // Check auto_shutoff when quota is about to be exceeded
      if (a.auto_shutoff && remainingKwh <= 0) {
        await updateAppliance(a.id, { is_active: false });
        shutoffIds.push(a.id);
      }
    }

    return shutoffIds;
  }, []);

  return { onApplianceToggled, checkAutoShutoff };
}