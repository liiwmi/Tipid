// src/app/_layout.tsx
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "../context/AppContext";
import { ProfileProvider } from "../context/ProfileContext";
import { SettingsProvider, useSettings } from "../context/SettingsContext";
import { ThemeProvider } from "../context/ThemeContext";
import { useAppliances } from "../hooks/useAppliance";
import { supabase } from "../lib/supabase";
import { registerBackgroundOptimization } from "../services/backgroundOptimizer";
import { checkAndFireNotifications } from "../services/notificationService";

ExpoSplashScreen.preventAutoHideAsync();

// ─── NOTIFICATION CONTROLLER ─────────────────────────────────
function NotificationController() {
  const { appliances, totalDailyKwh, loading } = useAppliances();
  const { dailyQuota, notifQuota, notifPeak } = useSettings();

  useEffect(() => {
    if (loading || appliances.length === 0) return;

    checkAndFireNotifications(
      appliances,
      totalDailyKwh,
      dailyQuota,
      notifQuota,
      notifPeak,
    );

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && !loading) {
        checkAndFireNotifications(
          appliances,
          totalDailyKwh,
          dailyQuota,
          notifQuota,
          notifPeak,
        );
      }
    });

    return () => sub.remove();
  }, [appliances, totalDailyKwh, dailyQuota, notifQuota, notifPeak, loading]);

  return null;
}

// ─── SPLASH SCREEN ───────────────────────────────────────────
function SplashScreen() {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bgAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const bgColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ffffff", "#adcf12"],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: bgColor,
        gap: 16,
      }}
    >
      <Animated.Image
        source={require("../../assets/tipid-logo.png")}
        style={{
          width: 100,
          height: 100,
          resizeMode: "contain",
          transform: [{ translateX: slideAnim }],
        }}
      />
      <Animated.Image
        source={require("../../assets/tipid-title.png")}
        style={{
          width: 200,
          height: 60,
          resizeMode: "contain",
          transform: [{ translateX: slideAnim }],
        }}
      />
      <ActivityIndicator
        size="small"
        color="#5a7a00"
        style={{ marginTop: 24 }}
      />
    </Animated.View>
  );
}

// ─── ROOT LAYOUT ─────────────────────────────────────────────
export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [authEvent, setAuthEvent] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthEvent(_event);
      setSession(session);
      if (!isInitialized) setIsInitialized(true);
      setShowSplash(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
      ExpoSplashScreen.hideAsync();
      setTimeout(() => setShowSplash(false), 800);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized || showSplash) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (session) {
      if (inAuthGroup) {
        if (authEvent === "SIGNED_IN") {
          supabase.auth.getUser().then(({ data: { user } }) => {
            const hasName = user?.user_metadata?.display_name;
            if (!hasName) {
              router.replace("/(auth)/onboarding" as any);
            } else {
              router.replace("/(main)/" as any);
            }
          });
        } else {
          router.replace("/(main)/" as any);
        }
      }
    } else if (!inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, isInitialized, showSplash, segments]);

  if (!isInitialized || showSplash) {
    return <SplashScreen />;
  }

  useEffect(() => {
    registerBackgroundOptimization();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppProvider>
            <ProfileProvider>
              <NotificationController />
              <Stack screenOptions={{ headerShown: false }} />
            </ProfileProvider>
          </AppProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
