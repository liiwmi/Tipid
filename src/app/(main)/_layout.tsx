// src/app/(main)/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CustomDrawer from "../../components/drawer/CustomDrawer";

export default function MainLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: "right",
          drawerStyle: {
            width: "85%", // Gives your inline settings controls ample room to breathe
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Dashboard",
            drawerIcon: ({ color }) => (
              <Ionicons name="home-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="appliances"
          options={{
            title: "Appliances",
            drawerIcon: ({ color }) => (
              <Ionicons name="flash-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: "Settings & Preferences",
            drawerIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: "My Profile",
            drawerIcon: ({ color }) => (
              <Ionicons name="person-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="report"
          options={{
            drawerLabel: "Algorithm Report",
            drawerIcon: ({ color }) => (
              <Ionicons name="bar-chart-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="support"
          options={{
            drawerLabel: "Help & Support",
            drawerIcon: ({ color }) => (
              <Ionicons name="help-circle-outline" size={24} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="privacy"
          options={{
            drawerLabel: "Privacy & Security",
            drawerIcon: ({ color }) => (
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
