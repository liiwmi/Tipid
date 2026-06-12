// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, AppState, AppStateStatus } from "react-native";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { lightColors as colors } from "../styles/theme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { AppProvider } from "../context/AppContext";
import { SettingsProvider, useSettings } from "../context/SettingsContext";
import { checkAndFireNotifications } from "../services/notificationService";
import { useAppliances } from "../hooks/useAppliance";

// ─── NOTIFICATION CONTROLLER ─────────────────────────────────
// Invisible component — runs inside providers so it can access context
function NotificationController() {
  const { appliances, totalDailyKwh, loading } = useAppliances();
  const { dailyQuota, notifQuota, notifPeak } = useSettings();

  useEffect(() => {
    // Don't fire while data is still loading
    if (loading || appliances.length === 0) return;

    checkAndFireNotifications(
      appliances, totalDailyKwh, dailyQuota, notifQuota, notifPeak
    );

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && !loading) {
        checkAndFireNotifications(
          appliances, totalDailyKwh, dailyQuota, notifQuota, notifPeak
        );
      }
    });

    return () => sub.remove();
  }, [appliances, totalDailyKwh, dailyQuota, notifQuota, notifPeak, loading]);

  return null;
}

// ─── ROOT LAYOUT ─────────────────────────────────────────────
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // ── AUTH STATE ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── ROUTING GUARD ───────────────────────────────────────
  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (session && inAuthGroup) {
      router.replace("/(main)/" as any);
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, isInitialized, segments]);

  // ── LOADING SCREEN ──────────────────────────────────────
  if (!isInitialized) {
    return (
      <View style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.bgPrimary,
      }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppProvider>
            <NotificationController />
            <Stack screenOptions={{ headerShown: false }} />
          </AppProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}