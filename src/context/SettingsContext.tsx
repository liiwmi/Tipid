// src/context/SettingsContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  RATE:        '@tipid_electricity_rate',
  QUOTA:       '@tipid_daily_quota',
  NOTIF_QUOTA: '@tipid_notif_quota',
  NOTIF_PEAK:  '@tipid_notif_peak',
  NOTIF_WEEK:  '@tipid_notif_weekly',
  FONT_SIZE:   '@tipid_font_size',
  TTS:         '@tipid_tts',
};

export type FontSize = 'small' | 'medium' | 'large';

export const FONT_SCALE: Record<FontSize, number> = {
  small:  0.85,
  medium: 1.0,
  large:  1.2,
};

interface SettingsContextType {
  // Electricity
  electricityRate: number;
  dailyQuota: number;
  setElectricityRate: (v: number) => Promise<void>;
  setDailyQuota: (v: number) => Promise<void>;

  // Notifications
  notifQuota: boolean;
  notifPeak: boolean;
  notifWeekly: boolean;
  setNotifQuota: (v: boolean) => Promise<void>;
  setNotifPeak: (v: boolean) => Promise<void>;
  setNotifWeekly: (v: boolean) => Promise<void>;

  // Accessibility
  fontSize: FontSize;
  ttsEnabled: boolean;
  setFontSize: (v: FontSize) => Promise<void>;
  setTtsEnabled: (v: boolean) => Promise<void>;

  isLoaded: boolean;
}

const defaults: Omit<SettingsContextType, 'setElectricityRate' | 'setDailyQuota' | 'setNotifQuota' | 'setNotifPeak' | 'setNotifWeekly' | 'setFontSize' | 'setTtsEnabled'> = {
  electricityRate: 11.5,
  dailyQuota: 8.0,
  notifQuota: true,
  notifPeak: true,
  notifWeekly: false,
  fontSize: 'medium',
  ttsEnabled: false,
  isLoaded: false,
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaults,
  setElectricityRate: async () => {},
  setDailyQuota: async () => {},
  setNotifQuota: async () => {},
  setNotifPeak: async () => {},
  setNotifWeekly: async () => {},
  setFontSize: async () => {},
  setTtsEnabled: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [electricityRate, _setElectricityRate] = useState(defaults.electricityRate);
  const [dailyQuota, _setDailyQuota] = useState(defaults.dailyQuota);
  const [notifQuota, _setNotifQuota] = useState(defaults.notifQuota);
  const [notifPeak, _setNotifPeak] = useState(defaults.notifPeak);
  const [notifWeekly, _setNotifWeekly] = useState(defaults.notifWeekly);
  const [fontSize, _setFontSize] = useState<FontSize>(defaults.fontSize);
  const [ttsEnabled, _setTtsEnabled] = useState(defaults.ttsEnabled);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── LOAD ALL ON MOUNT ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rate, quota, nq, np, nw, fs, tts] = await AsyncStorage.multiGet([
          KEYS.RATE, KEYS.QUOTA, KEYS.NOTIF_QUOTA, KEYS.NOTIF_PEAK,
          KEYS.NOTIF_WEEK, KEYS.FONT_SIZE, KEYS.TTS,
        ]);
        if (rate[1])  _setElectricityRate(parseFloat(rate[1]));
        if (quota[1]) _setDailyQuota(parseFloat(quota[1]));
        if (nq[1])    _setNotifQuota(nq[1] === 'true');
        if (np[1])    _setNotifPeak(np[1] === 'true');
        if (nw[1])    _setNotifWeekly(nw[1] === 'true');
        if (fs[1])    _setFontSize(fs[1] as FontSize);
        if (tts[1])   _setTtsEnabled(tts[1] === 'true');
      } catch (_) {}
      setIsLoaded(true);
    })();
  }, []);

  // ── SETTERS ───────────────────────────────────────────────
  const setElectricityRate = async (v: number) => {
    _setElectricityRate(v);
    await AsyncStorage.setItem(KEYS.RATE, String(v));
  };
  const setDailyQuota = async (v: number) => {
    _setDailyQuota(v);
    await AsyncStorage.setItem(KEYS.QUOTA, String(v));
  };
  const setNotifQuota = async (v: boolean) => {
    _setNotifQuota(v);
    await AsyncStorage.setItem(KEYS.NOTIF_QUOTA, String(v));
  };
  const setNotifPeak = async (v: boolean) => {
    _setNotifPeak(v);
    await AsyncStorage.setItem(KEYS.NOTIF_PEAK, String(v));
  };
  const setNotifWeekly = async (v: boolean) => {
    _setNotifWeekly(v);
    await AsyncStorage.setItem(KEYS.NOTIF_WEEK, String(v));
  };
  const setFontSize = async (v: FontSize) => {
    _setFontSize(v);
    await AsyncStorage.setItem(KEYS.FONT_SIZE, v);
  };
  const setTtsEnabled = async (v: boolean) => {
    _setTtsEnabled(v);
    await AsyncStorage.setItem(KEYS.TTS, String(v));
  };

  return (
    <SettingsContext.Provider value={{
      electricityRate, dailyQuota,
      notifQuota, notifPeak, notifWeekly,
      fontSize, ttsEnabled, isLoaded,
      setElectricityRate, setDailyQuota,
      setNotifQuota, setNotifPeak, setNotifWeekly,
      setFontSize, setTtsEnabled,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);