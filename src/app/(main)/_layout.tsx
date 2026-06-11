// src/app/(main)/_layout.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from '../../components/drawer/CustomDrawer'; 

export default function MainLayout() {
  return(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <CustomDrawer {...props} />}
        screenOptions={{
          headerShown: false,
          drawerPosition: 'right',
          drawerStyle: {
            width: '85%', // Gives your inline settings controls ample room to breathe
          },
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            drawerIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
          }}
        />
        <Drawer.Screen
          name="appliances"
          options={{
            title: 'Appliances',
            drawerIcon: ({ color }) => <Ionicons name="flash-outline" size={24} color={color} />,
          }}
        />
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: 'Settings & Preferences',
            drawerIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
          }}
        />
        <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: 'My Profile',
          drawerIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
      </Drawer>
    </GestureHandlerRootView>
  );
}