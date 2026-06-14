// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Image,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../context/ThemeContext";
import { AppProvider } from "../context/AppContext";
import { SettingsProvider, useSettings } from "../context/SettingsContext";
import { checkAndFireNotifications } from "../services/notificationService";
import { useAppliances } from "../hooks/useAppliance";
import * as ExpoSplashScreen from 'expo-splash-screen';

ExpoSplashScreen.preventAutoHideAsync();
// ─── NOTIFICATION CONTROLLER ─────────────────────────────────
function NotificationController() {
  const { appliances, totalDailyKwh, loading } = useAppliances();
  const { dailyQuota, notifQuota, notifPeak } = useSettings();

  useEffect(() => {
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
    outputRange: ['#ffffff', '#adcf12'],
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: bgColor,
        gap: 16,
      }}
    >
      <Animated.Image
    source={require('../../assets/tipid-logo.png')}
    style={{
      width: 100,
      height: 100,
      resizeMode: 'contain',
      transform: [{ translateX: slideAnim }],
    }}
  />
  <Animated.Image
    source={require('../../assets/tipid-title.png')}
    style={{
      width: 200,
      height: 60,
      resizeMode: 'contain',
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
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
   supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setIsInitialized(true);
  ExpoSplashScreen.hideAsync(); 
  });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (session && inAuthGroup) {
      router.replace("/(main)/" as any);
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, isInitialized, segments]);

  if (!isInitialized) {
    return <SplashScreen />;
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