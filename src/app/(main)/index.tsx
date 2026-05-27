// src/app/(main)/index.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Updated interface to include hours
interface Appliance {
  id: string;
  name: string;
  watts: number;
  hours_per_day: number;
}

// Average PH Electricity Rate (PHP per kWh)
const ELECTRICITY_RATE = 11.5;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newName, setNewName] = useState("");
  const [newWatts, setNewWatts] = useState("");
  const [newHours, setNewHours] = useState("");

  useEffect(() => {
    fetchAppliances();
  }, []);

  async function fetchAppliances() {
    setLoading(true);
    const { data, error } = await supabase
      .from("appliances")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) Alert.alert("Error", error.message);
    else setAppliances(data || []);

    setLoading(false);
  }

  async function handleAddAppliance() {
    if (!newName || !newWatts || !newHours) {
      Alert.alert("Missing Info", "Please fill out all three fields.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("appliances").insert([
      {
        name: newName,
        watts: Number(newWatts),
        hours_per_day: Number(newHours),
        user_id: user.id,
      },
    ]);

    if (error) {
      Alert.alert("Error adding appliance", error.message);
    } else {
      setNewName("");
      setNewWatts("");
      setNewHours("");
      fetchAppliances(); // Refresh the list
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  // --- THE MATH ENGINE ---
  // Formula: (Watts * Hours / 1000) = Daily kWh
  // Daily kWh * Rate = Daily Cost in PHP

  const calculateItemCost = (watts: number, hours: number) => {
    const kwh = (watts * hours) / 1000;
    return kwh * ELECTRICITY_RATE;
  };

  const totalDailyCost = appliances.reduce((total, item) => {
    return total + calculateItemCost(item.watts, item.hours_per_day);
  }, 0);

  const totalDailyKwh = appliances.reduce((total, item) => {
    return total + (item.watts * item.hours_per_day) / 1000;
  }, 0);

  // --- UI RENDER ---
  const renderItem = ({ item }: { item: Appliance }) => {
    const dailyCost = calculateItemCost(item.watts, item.hours_per_day);

    return (
      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={[styles.subtitle, { fontSize: 12, marginTop: 2 }]}>
            {item.watts}W • {item.hours_per_day} hrs/day
          </Text>
        </View>
        <Text style={styles.cardValue}>₱{dailyCost.toFixed(2)}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="menu" size={32} color="#2c3e50" />
          </TouchableOpacity>
          <Text style={[styles.title, { marginBottom: 0, fontSize: 32 }]}>
            Overview
          </Text>
          <View style={{ width: 32 }} />{" "}
          {/* Invisible spacer to keep the title perfectly centered */}
        </View>

        {/* The New Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Estimated Daily Cost</Text>
          <Text style={styles.summaryValue}>₱{totalDailyCost.toFixed(2)}</Text>
          <Text
            style={[
              styles.summaryLabel,
              { marginTop: 4, textTransform: "none" },
            ]}
          >
            Total Usage: {totalDailyKwh.toFixed(2)} kWh / day
          </Text>
        </View>

        {/* Add Appliance Form */}
        <View style={[styles.formContainer, { marginBottom: 20, padding: 15 }]}>
          <Text
            style={[
              styles.subtitle,
              { marginBottom: 15, textAlign: "left", fontWeight: "bold" },
            ]}
          >
            Add Appliance
          </Text>

          <TextInput
            style={[styles.input, { marginBottom: 10 }]}
            placeholder="Appliance Name (e.g. Electric Fan)"
            value={newName}
            onChangeText={setNewName}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Watts"
              value={newWatts}
              onChangeText={setNewWatts}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Hours/Day"
              value={newHours}
              onChangeText={setNewHours}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { marginTop: 15 }]}
            onPress={handleAddAppliance}
          >
            <Text style={styles.buttonText}>Calculate & Add</Text>
          </TouchableOpacity>
        </View>

        {/* Appliance List */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#3498db"
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={appliances}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                No appliances added yet. Start adding some!
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
