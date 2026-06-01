import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes, fontWeights, spacing, borderRadius } from "../../styles/theme";
import { APPLIANCE_ICONS } from "../../constants/appliance-icons";
import { Appliance } from "../../types/appliance";
import { useTheme } from "../../context/ThemeContext";
import Overlay from "../common/Overlay";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetGesture } from "../../hooks/useBottomSheetGesture";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (appliance: Omit<Appliance, "id" | "created_at" | "user_id">) => Promise<void>;
}

type Priority = "low" | "medium" | "high";

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "#2e7d32" },
  { value: "medium", label: "Medium", color: "#f57f17" },
  { value: "high",   label: "High",   color: "#c62828" },
];

export default function AddApplianceModal({ visible, onClose, onAdd }: Props): React.ReactElement {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [watts, setWatts] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("");
  const [priority, setPriority] = useState<Priority>("low");
  const [selectedIcon, setSelectedIcon] = useState("flash-outline");
  const [peakStart, setPeakStart] = useState("");
  const [peakEnd, setPeakEnd] = useState("");
  const [loading, setLoading] = useState(false);

  // ── GESTURE ───────────────────────────────────────────────
  const { translateY, panResponder, reset } = useBottomSheetGesture({
    onClose: () => handleClose(),
  });

  // ── HANDLE CLOSE ──────────────────────────────────────────
  const handleClose = () => {
    reset();
    setName("");
    setWatts("");
    setHoursPerDay("");
    setPriority("low");
    setSelectedIcon("flash-outline");
    setPeakStart("");
    setPeakEnd("");
    onClose();
  };

  // ── HANDLE SUBMIT ─────────────────────────────────────────
  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) return Alert.alert("Validation", "Appliance name is required.");
    if (!watts || isNaN(Number(watts))) return Alert.alert("Validation", "Enter a valid wattage.");
    if (!hoursPerDay || isNaN(Number(hoursPerDay))) return Alert.alert("Validation", "Enter valid hours per day.");
    if (priority === "medium") {
      if (!peakStart || !peakEnd) return Alert.alert("Validation", "Enter peak start and end time.");
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(peakStart) || !timeRegex.test(peakEnd)) {
        return Alert.alert("Validation", "Time format should be HH:MM (e.g. 14:00)");
      }
    }
    setLoading(true);
    await onAdd({
      name: name.trim(),
      watts: Number(watts),
      hours_per_day: Number(hoursPerDay),
      priority,
      icon: selectedIcon,
      peak_start: priority === "medium" ? peakStart : null,
      peak_end: priority === "medium" ? peakEnd : null,
      original_priority: null,
      is_active: true,
    });
    setLoading(false);
    handleClose();
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <>
      <Overlay visible={visible} onPress={handleClose} />

      <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={modalStyles.sheetWrapper} pointerEvents="box-none">
          <Animated.View
            style={[
              modalStyles.sheet,
              {
                backgroundColor: colors.bgCard,
                paddingBottom: spacing.lg + insets.bottom,
                transform: [{ translateY }],
              },
            ]}
          >
            {/* HANDLE — drag target */}
            <View {...panResponder.panHandlers}>
              <View style={[modalStyles.handle, { backgroundColor: colors.borderDefault }]} />
            </View>

            {/* HEADER */}
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: colors.textPrimary }]}>
                Add Appliance
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* ICON PICKER */}
              <Text style={[modalStyles.label, { color: colors.textLabel }]}>Icon</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={modalStyles.iconGrid}
              >
                {APPLIANCE_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon.name}
                    style={[
                      modalStyles.iconItem,
                      { backgroundColor: colors.bgInput, borderColor: colors.borderDefault },
                      selectedIcon === icon.name && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setSelectedIcon(icon.name)}
                  >
                    <Ionicons
                      name={icon.name as any}
                      size={24}
                      color={selectedIcon === icon.name ? colors.textOnDark : colors.textPrimary}
                    />
                    <Text style={[
                      modalStyles.iconLabel,
                      { color: selectedIcon === icon.name ? colors.textOnDark : colors.textPrimary },
                    ]}>
                      {icon.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* NAME */}
              <Text style={[modalStyles.label, { color: colors.textLabel }]}>Appliance Name</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault, color: colors.textPrimary }]}
                placeholder="e.g. Living Room AC"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />

              {/* WATTS */}
              <Text style={[modalStyles.label, { color: colors.textLabel }]}>Watts (W)</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault, color: colors.textPrimary }]}
                placeholder="e.g. 1500"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={watts}
                onChangeText={setWatts}
              />

              {/* HOURS PER DAY */}
              <Text style={[modalStyles.label, { color: colors.textLabel }]}>Hours per Day</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault, color: colors.textPrimary }]}
                placeholder="e.g. 8"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={hoursPerDay}
                onChangeText={setHoursPerDay}
              />

              {/* PRIORITY */}
              <Text style={[modalStyles.label, { color: colors.textLabel }]}>Priority</Text>
              <View style={modalStyles.priorityRow}>
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      modalStyles.priorityOption,
                      { borderColor: colors.borderDefault },
                      priority === option.value && { backgroundColor: option.color, borderColor: option.color },
                    ]}
                    onPress={() => setPriority(option.value)}
                  >
                    <Text style={[
                      modalStyles.priorityText,
                      { color: priority === option.value ? colors.textOnDark : colors.textPrimary },
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* PEAK TIME */}
              {priority === "medium" && (
                <View style={[modalStyles.peakContainer, { backgroundColor: colors.bgSecondary }]}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                  <Text style={[modalStyles.peakInfo, { color: colors.primary }]}>
                    During this time window, priority will automatically upgrade to High.
                  </Text>
                  <View style={modalStyles.peakRow}>
                    <View style={modalStyles.peakInputWrapper}>
                      <Text style={[modalStyles.label, { color: colors.textLabel }]}>From</Text>
                      <TextInput
                        style={[modalStyles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault, color: colors.textPrimary }]}
                        placeholder="14:00"
                        placeholderTextColor={colors.textSecondary}
                        value={peakStart}
                        onChangeText={setPeakStart}
                      />
                    </View>
                    <View style={modalStyles.peakInputWrapper}>
                      <Text style={[modalStyles.label, { color: colors.textLabel }]}>To</Text>
                      <TextInput
                        style={[modalStyles.input, { backgroundColor: colors.bgInput, borderColor: colors.borderDefault, color: colors.textPrimary }]}
                        placeholder="18:00"
                        placeholderTextColor={colors.textSecondary}
                        value={peakEnd}
                        onChangeText={setPeakEnd}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* SUBMIT */}
              <TouchableOpacity
                style={[modalStyles.submitButton, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={[modalStyles.submitText, { color: colors.textOnDark }]}>
                  {loading ? "Adding..." : "Add Appliance"}
                </Text>
              </TouchableOpacity>

              <View style={{ height: spacing.xxl }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    height: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  label: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.base,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  iconGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconItem: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  iconLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  priorityRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  peakContainer: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  peakInfo: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  peakRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  peakInputWrapper: {
    flex: 1,
  },
  submitButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  submitText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
});