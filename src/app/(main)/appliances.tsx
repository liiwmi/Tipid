import { Ionicons } from "@expo/vector-icons";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import ApplianceList from "../../components/dashboard/ApplianceList";
import AddApplianceModal from "../../components/modals/AddApplianceModal";
import { useAppContext } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppliances } from "../../hooks/useAppliance";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";
// 1. ADDED THE IMPORT HERE
import { fetchOptimization } from "../../services/api";
import { useState } from "react";

export default function AppliancesScreen() {
  const { colors } = useTheme();
  const { appliances, activeAppliances, loading, isOnline, addAppliance } =
    useAppliances();
 const [addApplianceVisible, setAddApplianceVisible] = useState(false);
  const openAddAppliance = () => setAddApplianceVisible(true);
  const closeAddAppliance = () => setAddApplianceVisible(false);
  const insets = useSafeAreaInsets();

  // 2. ADDED TEMPORARY VARIABLES FOR TESTING
  // Your frontend team will need to connect these to real inputs later
  const budget = 500;
  const electricityRate = 11.9;

  const handleOptimize = async () => {
    const currentHour = new Date().getHours();

    try {
      // 3. SENDING DATA TO YOUR PYTHON BACKEND
      const optimizationResult = await fetchOptimization(
        appliances,
        budget,
        electricityRate,
        currentHour,
      );

      console.log("Algorithm Result:", optimizationResult);
      alert("Success! Check your terminal for the algorithm results.");
    } catch (error) {
      console.error("Failed to connect to the Python engine:", error);
      alert("Backend connection failed. Is the Python server running?");
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[screenStyles.container, { backgroundColor: colors.bgSecondary }]}
    >
      {/* HEADER */}
      <View
        style={[
          screenStyles.header,
          { borderBottomColor: colors.borderDefault },
        ]}
      >
        <Text style={[screenStyles.title, { color: colors.textPrimary }]}>
          Appliances
        </Text>
        <View style={screenStyles.headerRight}>
          {!isOnline && (
            <View
              style={[
                screenStyles.offlineBadge,
                { backgroundColor: colors.priorityHighBg },
              ]}
            >
              <Ionicons
                name="cloud-offline-outline"
                size={12}
                color={colors.priorityHighText}
              />
              <Text
                style={[
                  screenStyles.offlineText,
                  { color: colors.priorityHighText },
                ]}
              >
                Offline
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* STATS ROW */}
      <View style={[screenStyles.statsRow, { backgroundColor: colors.bgCard }]}>
        <View style={screenStyles.statItem}>
          <Text style={[screenStyles.statValue, { color: colors.primary }]}>
            {appliances.length}
          </Text>
          <Text
            style={[screenStyles.statLabel, { color: colors.textSecondary }]}
          >
            Total
          </Text>
        </View>
        <View
          style={[
            screenStyles.statDivider,
            { backgroundColor: colors.borderDefault },
          ]}
        />
        <View style={screenStyles.statItem}>
          <Text style={[screenStyles.statValue, { color: colors.secondary }]}>
            {activeAppliances.length}
          </Text>
          <Text
            style={[screenStyles.statLabel, { color: colors.textSecondary }]}
          >
            Active
          </Text>
        </View>
        <View
          style={[
            screenStyles.statDivider,
            { backgroundColor: colors.borderDefault },
          ]}
        />
        <View style={screenStyles.statItem}>
          <Text
            style={[screenStyles.statValue, { color: colors.priorityHighText }]}
          >
            {appliances.filter((a) => a.priority === "high").length}
          </Text>
          <Text
            style={[screenStyles.statLabel, { color: colors.textSecondary }]}
          >
            High Priority
          </Text>
        </View>
        <View
          style={[
            screenStyles.statDivider,
            { backgroundColor: colors.borderDefault },
          ]}
        />
        <View style={screenStyles.statItem}>
          <Text
            style={[screenStyles.statValue, { color: colors.priorityMedText }]}
          >
            {appliances.filter((a) => a.priority === "medium").length}
          </Text>
          <Text
            style={[screenStyles.statLabel, { color: colors.textSecondary }]}
          >
            Medium
          </Text>
        </View>
      </View>

      {/* 4. ADDED THE BUTTON HERE */}
      <TouchableOpacity
        style={[
          screenStyles.optimizeButton,
          { backgroundColor: colors.primary },
        ]}
        onPress={handleOptimize}
      >
        <Ionicons name="flash" size={20} color={colors.textOnDark} />
        <Text
          style={[
            screenStyles.optimizeButtonText,
            { color: colors.textOnDark },
          ]}
        >
          Run TIPID Algorithm
        </Text>
      </TouchableOpacity>

      {/* LIST */}
      <ScrollView
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ApplianceList appliances={appliances} loading={loading} />
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[
          screenStyles.fab,
          { backgroundColor: colors.primary, bottom: 30 + insets.bottom },
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

const screenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  offlineText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "70%",
    alignSelf: "center",
  },
  optimizeButton: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 3,
    shadowColor: "#fc5d00",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  optimizeButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#fc5d00",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
