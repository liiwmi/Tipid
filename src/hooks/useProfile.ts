import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const PROFILE_CACHE_KEY = "@tipid_profile";

export interface UserProfile {
  displayName: string;
  email: string;
  phone: string;
  region: "Luzon" | "Visayas" | "Mindanao" | "";
  avatarUri: string | null;
}

const defaultProfile: UserProfile = {
  displayName: "",
  email: "",
  phone: "",
  region: "",
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

      try {
        const cached = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
        console.log("Cached profile:", cached);
        if (cached) setProfile(JSON.parse(cached));
      } catch (_) {}

      const net = await NetInfo.fetch();
      if (net.isConnected && net.isInternetReachable) {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          console.log("User metadata:", user?.user_metadata);
          if (user) {
            const meta = user.user_metadata ?? {};
            const synced: UserProfile = {
              displayName: meta.display_name ?? "",
              email: user.email ?? "",
              phone: meta.phone ?? "",
              region: meta.region ?? "",
              avatarUri: meta.avatar_uri ?? null,
            };
            setProfile(synced);
            await AsyncStorage.setItem(
              PROFILE_CACHE_KEY,
              JSON.stringify(synced),
            );
          }
        } catch (e) {
          console.log("Supabase profile error:", e);
        }
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
