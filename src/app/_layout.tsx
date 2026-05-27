// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { colors } from "../styles/theme"; // Using your new scalable theme!

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  // 1. Listen for Supabase login/logout events
  useEffect(() => {
    // Get the initial session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    // Listen for changes (like when the user clicks 'Sign In')
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. The Traffic Cop: Redirect based on session state
  useEffect(() => {
    if (!isInitialized) return;

    // Check if the user is currently inside the (auth) folder
    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      // User is logged in but stuck on the login screen -> Send to Main App
      router.replace("/(main)/");
    } else if (!session && !inAuthGroup) {
      // User is NOT logged in but trying to view the app -> Send to Login
      router.replace("/(auth)/login");
    }
  }, [session, isInitialized, segments]);

  // 3. Show a loading spinner while checking credentials
  if (!isInitialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 4. Render the app without default headers (we will build our own UI)
  return <Stack screenOptions={{ headerShown: false }} />;
}
