import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { globalStyles as styles } from "../../styles/styles";
import { useTheme } from "../../context/ThemeContext";
import { useAppliances } from "../../hooks/useAppliance";
import WeeklyChart from "../../components/dashboard/WeeklyChart";
import QuotaCard from "../../components/dashboard/QuotaCard";
import MetricsGrid from "../../components/dashboard/MetricsGrid";
import ApplianceList from "../../components/dashboard/ApplianceList";
import AddApplianceModal from "../../components/modals/AddApplianceModal";
import { useAppContext } from "../../context/AppContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePeakHour } from "../../hooks/usePeakHour";
import { useDailyUsage } from '../../hooks/useDailyUsage';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const {
    appliances,
    loading,
    totalDailyKwh,
    totalDailyCost,
    progressWidth,
    addAppliance,
  } = useAppliances();
  const weeklyUsage = useDailyUsage(totalDailyKwh);
  const { label: peakLabel, isInPeak } = usePeakHour(appliances);
  const [addApplianceVisible, setAddApplianceVisible] = useState(false);
  const openAddAppliance = () => setAddApplianceVisible(true);
  const closeAddAppliance = () => setAddApplianceVisible(false);
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.safeArea, { backgroundColor: colors.bgSecondary }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greetingText, { color: colors.textPrimary }]}>
              Good Morning,
            </Text>
            <Text style={[styles.nameText, { color: colors.primary }]}>
              Ryul Kim
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: colors.bgAvatar },
            ]}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <WeeklyChart data={weeklyUsage} />
        <QuotaCard
          totalDailyKwh={totalDailyKwh}
          totalDailyCost={totalDailyCost}
          progressWidth={progressWidth}
        />
        <MetricsGrid
          applianceCount={appliances.length}
          peakLabel={peakLabel}
          isInPeak={isInPeak}
        />

        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          APPLIANCES
        </Text>
        <ApplianceList appliances={appliances} loading={loading} />

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.fab, bottom: 30 + insets.bottom },
        ]}
        onPress={() => openAddAppliance()}
      >
        <Ionicons name="add" size={32} color={colors.textOnDark} />
      </TouchableOpacity>

      <AddApplianceModal
        visible={addApplianceVisible}
        onClose={closeAddAppliance}
        onAdd={addAppliance}
      />
    </SafeAreaView>
  );
}
