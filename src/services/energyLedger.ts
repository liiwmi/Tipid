import AsyncStorage from '@react-native-async-storage/async-storage';

const LEDGER_KEY = '@tipid_energy_ledger';
const SESSION_KEY = '@tipid_energy_sessions';

export interface EnergyLedgerEntry {
  date: string;           // "YYYY-MM-DD"
  accumulatedKwh: number; // total kWh for this day, only ever increases
  lastUpdatedAt: string;  // ISO timestamp
}

export interface ApplianceSession {
  applianceId: string;
  applianceName: string;
  watts: number;
  startedAt: string;      // ISO timestamp when turned on or last snapshotted
  kwhContributed: number; // running total this session
}

// ── READ ─────────────────────────────────────────────────────

export async function getLedgerEntry(date: string): Promise<EnergyLedgerEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const ledger: EnergyLedgerEntry[] = raw ? JSON.parse(raw) : [];
    return ledger.find((e) => e.date === date) ?? null;
  } catch {
    return null;
  }
}

export async function getTodayAccumulatedKwh(): Promise<number> {
  const today = getTodayString();
  const entry = await getLedgerEntry(today);
  return entry?.accumulatedKwh ?? 0;
}

// ── WRITE ────────────────────────────────────────────────────

// This is the ONLY function that writes to the ledger.
// It only ever increases the value — never decreases it.
export async function recordEnergySnapshot(kwh: number): Promise<void> {
  if (kwh <= 0) return;
  const today = getTodayString();

  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const ledger: EnergyLedgerEntry[] = raw ? JSON.parse(raw) : [];
    const idx = ledger.findIndex((e) => e.date === today);

    if (idx >= 0) {
      // Only update if new value is HIGHER than stored — ledger never goes backwards
      if (kwh > ledger[idx].accumulatedKwh) {
        ledger[idx].accumulatedKwh = kwh;
        ledger[idx].lastUpdatedAt = new Date().toISOString();
      }
    } else {
      ledger.push({
        date: today,
        accumulatedKwh: kwh,
        lastUpdatedAt: new Date().toISOString(),
      });
    }

    // Keep 90 days
    const trimmed = ledger
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90);

    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(trimmed));
  } catch {}
}

// ── SESSIONS (tracks per-appliance runtime for accurate kwh) ─

export async function getActiveSessions(): Promise<ApplianceSession[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function startApplianceSession(
  applianceId: string,
  applianceName: string,
  watts: number,
): Promise<void> {
  try {
    const sessions = await getActiveSessions();
    const existing = sessions.find((s) => s.applianceId === applianceId);
    if (existing) return; // already tracking

    sessions.push({
      applianceId,
      applianceName,
      watts,
      startedAt: new Date().toISOString(),
      kwhContributed: 0,
    });
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  } catch {}
}

export async function stopApplianceSession(
  applianceId: string,
): Promise<number> {
  // Returns kWh consumed in this session
  try {
    const sessions = await getActiveSessions();
    const idx = sessions.findIndex((s) => s.applianceId === applianceId);
    if (idx < 0) return 0;

    const session = sessions[idx];
    const elapsedHours =
      (Date.now() - new Date(session.startedAt).getTime()) / 3_600_000;
    const kwhThisSession = (session.watts / 1000) * elapsedHours;

    sessions.splice(idx, 1);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessions));

    return kwhThisSession;
  } catch {
    return 0;
  }
}

// Snapshot all active sessions without stopping them
// Returns total kWh from all currently running appliances since their last start
export async function snapshotActiveSessions(): Promise<number> {
  try {
    const sessions = await getActiveSessions();
    return sessions.reduce((sum, s) => {
      const elapsedHours =
        (Date.now() - new Date(s.startedAt).getTime()) / 3_600_000;
      return sum + (s.watts / 1000) * elapsedHours;
    }, 0);
  } catch {
    return 0;
  }
}

export async function clearTodaySessions(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ── HELPERS ──────────────────────────────────────────────────

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getLast7DaysLedger(): Promise<EnergyLedgerEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const ledger: EnergyLedgerEntry[] = raw ? JSON.parse(raw) : [];
    const today = getTodayString();
    const result: EnergyLedgerEntry[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = ledger.find((e) => e.date === dateStr);
      result.push(
        entry ?? { date: dateStr, accumulatedKwh: 0, lastUpdatedAt: '' },
      );
    }

    return result;
  } catch {
    return [];
  }
}