// src/app/(main)/settings.tsx
import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";

export default function SettingsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="menu" size={32} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={[styles.title, { marginBottom: 0, fontSize: 32 }]}>
            Settings
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { marginTop: 40 }]}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.secondaryButtonText}>Sign Out of Tipid</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
