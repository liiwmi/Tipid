import { checkAndFireNotifications } from "@/src/services/notificationService";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import GradientBackground from "../../components/common/Gradientbackground";
import ApplianceList from "../../components/dashboard/ApplianceList";
import MetricsGrid from "../../components/dashboard/MetricsGrid";
import QuotaCard from "../../components/dashboard/QuotaCard";
import WeeklyChart from "../../components/dashboard/WeeklyChart";
import AddApplianceModal from "../../components/modals/AddApplianceModal";
import { useProfileContext } from "../../context/ProfileContext";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppliances } from "../../hooks/useAppliance";
import { useDailyUsage } from "../../hooks/useDailyUsage";
import { usePeakHour } from "../../hooks/usePeakHour";
import { useQuotaProjection } from "../../hooks/useQuotaProjection";
import { useRecommendations } from "../../hooks/useRecommendation";
import { useRuntimeTracker } from "../../hooks/useRuntimeTracker";
import { globalStyles as styles } from "../../styles/styles";

export default function DashboardScreen() {
  const { projectedMinutesRemaining, recalculate, initPeriod } =
    useQuotaProjection();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const {
    appliances,
    activeAppliances,
    loading,
    totalDailyKwh,
    totalDailyCost,
    progressWidth,
    addAppliance,
    toggleActive,
    updateAppliance,
    deleteAppliance,
  } = useAppliances();
  const weeklyUsage = useDailyUsage(totalDailyKwh);
  const { label: peakLabel, isInPeak } = usePeakHour(appliances);
  const [addApplianceVisible, setAddApplianceVisible] = useState(false);
  const openAddAppliance = () => setAddApplianceVisible(true);
  const closeAddAppliance = () => setAddApplianceVisible(false);
  const insets = useSafeAreaInsets();
  const { profile } = useProfileContext();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good Morning,"
      : hour < 17
        ? "Good Afternoon,"
        : "Good Evening,";

  const { recommendations, schedule, runRecommendations } =
    useRecommendations();
  const { checkAutoShutoff } = useRuntimeTracker();
  const { electricityRate, dailyQuota, isLoaded: settingsLoaded } = useSettings();
  // Init the quota period anchor on first load
  useEffect(() => {
    initPeriod(totalDailyKwh);
  }, []);

  // Recalculate projection whenever consumption changes
  useEffect(() => {
    recalculate(totalDailyKwh, dailyQuota, appliances);
  }, [totalDailyKwh, dailyQuota, appliances]);

  // Check and fire notifications whenever consumption changes
  useEffect(() => {
    if (totalDailyKwh > 0) {
      checkAndFireNotifications(
        appliances,
        totalDailyKwh,
        dailyQuota,
        electricityRate,
        true,
        true,
        projectedMinutesRemaining,
      );
    }
  }, [totalDailyKwh]);
  useEffect(() => {
    const interval = setInterval(async () => {
      const remainingKwh = dailyQuota - totalDailyKwh;
      await checkAutoShutoff(appliances, remainingKwh, updateAppliance);
    }, 60_000);
    return () => clearInterval(interval);
  }, [appliances, totalDailyKwh, dailyQuota]);

  // Run recommendations whenever consumption changes
  useEffect(() => {
    if (appliances.length === 0 || !settingsLoaded) return;
    const budget = dailyQuota * electricityRate;
    runRecommendations(appliances, budget, electricityRate);
  }, [totalDailyKwh, appliances.length]);
  return (
    <GradientBackground>
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[styles.safeArea, { backgroundColor: "transparent" }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: "transparent" }}
        >
          {/* HEADER */}
          <View style={styles.headerRow}>
            <View>
              <Text
                style={[styles.greetingText, { color: colors.textPrimary }]}
              >
                {greeting}
              </Text>
              <Text style={[styles.nameText, { color: colors.primary }]}>
                {profile.displayName || "User!"}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.bgAvatar },
              ]}
              onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            >
              {profile.avatarUri ? (
                <Image
                  source={{ uri: profile.avatarUri }}
                  style={{ width: "100%", height: "100%", borderRadius: 999 }}
                />
              ) : (
                <Ionicons
                  name="person"
                  size={20}
                  color={colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>

          <WeeklyChart data={weeklyUsage} />
          <QuotaCard
            totalDailyKwh={totalDailyKwh}
            totalDailyCost={totalDailyCost}
            progressWidth={progressWidth}
            appliances={appliances}
            projectedMinutesRemaining={projectedMinutesRemaining}
          />
          <MetricsGrid
            applianceCount={activeAppliances.length}
            peakLabel={peakLabel}
            isInPeak={isInPeak}
          />

          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            APPLIANCES
          </Text>
          <ApplianceList
            appliances={appliances}
            loading={loading}
            onToggle={toggleActive}
            onUpdate={updateAppliance}
            onDelete={deleteAppliance}
          />

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* FAB */}
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.fab, bottom: 30 + insets.bottom },
          ]}
          onPress={openAddAppliance}
        >
          <Ionicons name="add" size={32} color={colors.textOnDark} />
        </TouchableOpacity>

        <AddApplianceModal
          visible={addApplianceVisible}
          onClose={closeAddAppliance}
          onAdd={addAppliance}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}
