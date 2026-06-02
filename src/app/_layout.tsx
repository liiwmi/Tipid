// src/app/_layout.tsx
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";
import { lightColors as colors } from "../styles/theme";
import { ThemeProvider } from "../context/ThemeContext";
import { AppProvider } from '../context/AppContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

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
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgPrimary,
        }}
      >
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

 return (
   <SafeAreaProvider>
    <ThemeProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);
}
