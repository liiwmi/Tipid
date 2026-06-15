// src/app/_layout.tsx
import NetInfo from "@react-native-community/netinfo";
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
  StyleSheet,
  Text,
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

// ─── OFFLINE BANNER ──────────────────────────────────────────────────────────
// Sits at the very top of the screen whenever the device has no internet.
// All cached data (settings, optimization results) still works while offline.
function OfflineBanner() {
  const slideAnim = useRef(new Animated.Value(-48)).current;
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(!!offline);

      Animated.timing(slideAnim, {
        toValue: offline ? 0 : -48,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[offlineStyles.banner, { transform: [{ translateY: slideAnim }] }]}
    >
      <Text style={offlineStyles.icon}></Text>
      <Text style={offlineStyles.text}>
        You're offline — showing saved data
      </Text>
    </Animated.View>
  );
}

const offlineStyles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#333333",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingTop: 48, // clears status bar
    gap: 8,
  },
  icon: {
    fontSize: 14,
  },
  text: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});

// ─── NOTIFICATION CONTROLLER ─────────────────────────────────────────────────
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

// ─── SPLASH SCREEN ───────────────────────────────────────────────────────────
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

// ─── ROOT LAYOUT ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    registerBackgroundOptimization();
  }, []);

  if (!isInitialized || showSplash) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppProvider>
            <ProfileProvider>
              {/* Offline banner — sits above everything, slides in when no internet */}
              <OfflineBanner />
              <NotificationController />
              <Stack screenOptions={{ headerShown: false }} />
            </ProfileProvider>
          </AppProvider>
        </SettingsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
