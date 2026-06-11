import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../context/ThemeContext";
import {
  fontSizes,
  fontWeights,
  spacing,
  borderRadius,
} from "../../styles/theme";

export default function CustomDrawer(props: any) {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login" as any);
        },
      },
    ]);
  };

  const navItems = [
    { label: "Settings", icon: "settings-outline", route: "/(main)/settings" },
    { label: "Appliances", icon: "flash-outline", route: "/(main)/appliances" },
    {
      label: "Algorithm Report",
      icon: "bar-chart-outline",
      route: "/(main)/report",
    },
    {
      label: "Notifications",
      icon: "notifications-outline",
      route: "/(main)/notifications",
    },
    {
      label: "Help & Support",
      icon: "help-circle-outline",
      route: "/(main)/support",
    },
    {
      label: "Privacy & Security",
      icon: "shield-checkmark-outline",
      route: "/(main)/privacy",
    },
  ];

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        drawerStyles.container,
        { backgroundColor: colors.bgPrimary },
      ]}
    >
      {/* PROFILE */}
      <TouchableOpacity
  style={drawerStyles.profileSection}
  onPress={() => {
    props.navigation.closeDrawer();
    props.navigation.navigate('profile');
  }}
>
  <View style={drawerStyles.profileRow}>
    <View style={[drawerStyles.avatar, { backgroundColor: colors.bgSecondary }]}>
      <Text style={[drawerStyles.avatarInitials, { color: colors.primary }]}>RK</Text>
    </View>
    <View style={drawerStyles.profileInfo}>
      <Text style={[drawerStyles.profileName, { color: colors.textPrimary }]}>Ryul Kim</Text>
      <Text style={[drawerStyles.profileEmail, { color: colors.textSecondary }]}>ryul@email.com</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
  </View>
</TouchableOpacity>

      <View
        style={[
          drawerStyles.divider,
          { backgroundColor: colors.borderDefault },
        ]}
      />

      {/* NAV ITEMS */}
      <View style={drawerStyles.section}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={drawerStyles.navItem}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color={colors.textPrimary}
            />
            <Text
              style={[drawerStyles.navLabel, { color: colors.textPrimary }]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* DARK MODE TOGGLE */}
        <View style={drawerStyles.toggleRow}>
          <View style={drawerStyles.toggleLeft}>
            <Ionicons
              name="moon-outline"
              size={22}
              color={colors.textPrimary}
            />
            <Text
              style={[drawerStyles.navLabel, { color: colors.textPrimary }]}
            >
              Dark Mode
            </Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{
              false: colors.switchTrackOff,
              true: colors.switchTrackOn,
            }}
            thumbColor={colors.switchThumb}
          />
        </View>
      </View>

      <View
        style={[
          drawerStyles.section,
          { marginTop: "auto", paddingTop: spacing.lg },
        ]}
      >
        <TouchableOpacity
          style={[drawerStyles.signOutButton, { borderColor: colors.danger }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[drawerStyles.signOutText, { color: colors.danger }]}>
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const drawerStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 72,
  },
  profileSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  editIcon: {
    padding: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md - 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  navLabel: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md - 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
  },
  addButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderWidth: 0.5,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
  },
  signOutText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
});
