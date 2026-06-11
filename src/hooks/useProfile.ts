import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import NetInfo from '@react-native-community/netinfo';

const PROFILE_CACHE_KEY = '@tipid_profile';

export interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  region: 'Luzon' | 'Visayas' | 'Mindanao' | '';
  avatarUri: string | null;
}

const defaultProfile: UserProfile = {
  displayName: '',
  email: '',
  phone: '',
  region: '',
  avatarUri: null,
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── LOAD ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);

      // Load from cache first
      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) setProfile(JSON.parse(cached));
      } catch (_) {}

      // Then try to sync from Supabase
      const net = await NetInfo.fetch();
      if (net.isConnected && net.isInternetReachable) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const meta = user.user_metadata ?? {};
            const synced: UserProfile = {
              displayName: meta.display_name ?? '',
              email: user.email ?? '',
              phone: meta.phone ?? '',
              region: meta.region ?? '',
              avatarUri: meta.avatar_uri ?? null,
            };
            setProfile(synced);
            await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(synced));
          }
        } catch (_) {}
      }

      setLoading(false);
    })();
  }, []);

  // ── SAVE ─────────────────────────────────────────────────
  async function saveProfile(updated: UserProfile) {
    setSaving(true);

    // Always save locally first
    try {
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
      setProfile(updated);
    } catch (_) {}

    // Then try to sync to Supabase
    const net = await NetInfo.fetch();
    if (net.isConnected && net.isInternetReachable) {
      try {
        await supabase.auth.updateUser({
          email: updated.email,
          data: {
            display_name: updated.displayName,
            phone: updated.phone,
            region: updated.region,
            avatar_uri: updated.avatarUri,
          },
        });
      } catch (_) {}
    }

    setSaving(false);
  }

  return { profile, loading, saving, saveProfile };
}