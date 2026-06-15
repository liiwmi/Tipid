import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTodayAccumulatedKwh,
  getLast7DaysLedger,
  recordEnergySnapshot,
  startApplianceSession,
  stopApplianceSession,
  snapshotActiveSessions,
  EnergyLedgerEntry,
} from '../services/energyLedger';
import { Appliance } from '../types/appliance';

interface EnergyLedgerHook {
  // The definitive kWh value to show on the progress bar
  // This NEVER decreases — even when appliances are deleted
  totalAccumulatedKwh: number;
  last7Days: EnergyLedgerEntry[];
  onApplianceTurnedOn: (appliance: Appliance) => Promise<void>;
  onApplianceTurnedOff: (appliance: Appliance) => Promise<void>;
  onApplianceDeleted: (appliance: Appliance) => Promise<void>;
  syncFromAppliances: (appliances: Appliance[]) => Promise<void>;
}

export function useEnergyLedger(): EnergyLedgerHook {
  const [totalAccumulatedKwh, setTotalAccumulatedKwh] = useState(0);
  const [last7Days, setLast7Days] = useState<EnergyLedgerEntry[]>([]);
  const snapshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshDisplay = useCallback(async () => {
    const kwh = await getTodayAccumulatedKwh();
    const days = await getLast7DaysLedger();
    setTotalAccumulatedKwh(kwh);
    setLast7Days(days);
  }, []);

  // On mount: load persisted ledger immediately
  useEffect(() => {
    refreshDisplay();

    // Snapshot active sessions every 5 minutes to keep ledger fresh
    // even if the app is open but appliances haven't been toggled
    snapshotIntervalRef.current = setInterval(async () => {
      const sessionKwh = await snapshotActiveSessions();
      const baseKwh = await getTodayAccumulatedKwh();
      const combined = baseKwh + sessionKwh;
      await recordEnergySnapshot(combined);
      await refreshDisplay();
    }, 5 * 60 * 1000);

    return () => {
      if (snapshotIntervalRef.current) {
        clearInterval(snapshotIntervalRef.current);
      }
    };
  }, []);

  // Called when user turns ON an appliance
  const onApplianceTurnedOn = useCallback(async (appliance: Appliance) => {
    await startApplianceSession(appliance.id, appliance.name, appliance.watts);
  }, []);

  // Called when user turns OFF an appliance
  const onApplianceTurnedOff = useCallback(async (appliance: Appliance) => {
    const kwhThisSession = await stopApplianceSession(appliance.id);
    if (kwhThisSession > 0) {
      const baseKwh = await getTodayAccumulatedKwh();
      await recordEnergySnapshot(baseKwh + kwhThisSession);
      await refreshDisplay();
    }
  }, []);

  // Called when an appliance is DELETED
  // Stops the session and records its consumption into the ledger
  // The base ledger value never decreases so the progress bar holds
  const onApplianceDeleted = useCallback(async (appliance: Appliance) => {
    const kwhThisSession = await stopApplianceSession(appliance.id);
    if (kwhThisSession > 0) {
      const baseKwh = await getTodayAccumulatedKwh();
      await recordEnergySnapshot(baseKwh + kwhThisSession);
    }
    // Do NOT subtract anything — the ledger only grows
    await refreshDisplay();
  }, []);

  // Called on app load to sync ledger from current appliance state
  // Uses the HIGHER of: what's in the ledger vs what appliances compute
  // This handles the case where ledger was cleared but appliances still exist
  const syncFromAppliances = useCallback(async (appliances: Appliance[]) => {
    const computedKwh = appliances.reduce(
      (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
      0,
    );
    const ledgerKwh = await getTodayAccumulatedKwh();

    // Take the higher value — never let sync reduce the ledger
    const authoritative = Math.max(computedKwh, ledgerKwh);
    if (authoritative > 0) {
      await recordEnergySnapshot(authoritative);
    }
    await refreshDisplay();
  }, []);

  return {
    totalAccumulatedKwh,
    last7Days,
    onApplianceTurnedOn,
    onApplianceTurnedOff,
    onApplianceDeleted,
    syncFromAppliances,
  };
}