import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Appliance } from "../../types/appliance";
import { APPLIANCE_ICONS } from "../../constants/appliance-icons";
import { borderRadius, fontSizes, fontWeights, spacing } from "../../styles/theme";

interface Props {
  appliance: Appliance | null;
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Appliance>) => Promise<void>;
  onDelete: (id: string) => void;
}

type Priority = "low" | "medium" | "high";

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "low",    label: "Low",    color: "#2e7d32" },
  { value: "medium", label: "Medium", color: "#f57f17" },
  { value: "high",   label: "High",   color: "#c62828" },
];

export default function EditApplianceModal({ appliance, visible, onClose, onSave, onDelete }: Props) {
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [watts, setWatts] = useState("");
  const [hoursPerDay, setHoursPerDay] = useState("");
  const [priority, setPriority] = useState<Priority>("low");
  const [selectedIcon, setSelectedIcon] = useState("flash-outline");
  const [peakStart, setPeakStart] = useState("");
  const [peakEnd, setPeakEnd] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate fields when appliance changes
  useEffect(() => {
    if (appliance) {
      setName(appliance.name);
      setWatts(String(appliance.watts));
      setHoursPerDay(String(appliance.hours_per_day));
      setPriority(appliance.priority);
      setSelectedIcon(appliance.icon);
      setPeakStart(appliance.peak_start ?? "");
      setPeakEnd(appliance.peak_end ?? "");
    }
  }, [appliance]);

  const handleSave = async () => {
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
    await onSave(appliance!.id, {
      name: name.trim(),
      watts: Number(watts),
      hours_per_day: Number(hoursPerDay),
      priority,
      icon: selectedIcon,
      peak_start: priority === "medium" ? peakStart : null,
      peak_end: priority === "medium" ? peakEnd : null,
    });
    setLoading(false);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Appliance",
      `Are you sure you want to delete "${appliance?.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete(appliance!.id);
            onClose();
          },
        },
      ]
    );
  };

  if (!appliance) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[s.safe, { backgroundColor: colors.bgSecondary }]}
      >
        {/* HEADER */}
        <View style={[s.header, { borderBottomColor: colors.borderDefault }]}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
            Edit Appliance
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            style={s.headerBtn}
          >
            <Text style={[s.saveText, { color: colors.primary }, loading && { opacity: 0.5 }]}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* ICON PICKER */}
          <Text style={[s.label, { color: colors.textSecondary }]}>ICON</Text>
          <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.iconGrid}
            >
              {APPLIANCE_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon.name}
                  style={[
                    s.iconItem,
                    { backgroundColor: colors.bgInput, borderColor: colors.borderDefault },
                    selectedIcon === icon.name && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedIcon(icon.name)}
                >
                  <Ionicons
                    name={icon.name as any}
                    size={24}
                    color={selectedIcon === icon.name ? "#fff" : colors.textPrimary}
                  />
                  <Text style={[
                    s.iconLabel,
                    { color: selectedIcon === icon.name ? "#fff" : colors.textSecondary },
                  ]}>
                    {icon.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* NAME */}
          <Text style={[s.label, { color: colors.textSecondary }]}>NAME</Text>
          <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <TextInput
              style={[s.input, { color: colors.textPrimary }]}
              placeholder="Appliance name"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* WATTS & HOURS */}
          <Text style={[s.label, { color: colors.textSecondary }]}>USAGE</Text>
          <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <View style={[s.row, { borderBottomColor: colors.borderDefault }]}>
              <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Wattage</Text>
              <TextInput
                style={[s.rowInput, { color: colors.textPrimary }]}
                value={watts}
                onChangeText={setWatts}
                keyboardType="numeric"
                placeholder="e.g. 1500"
                placeholderTextColor={colors.textSecondary}
                textAlign="right"
              />
              <Text style={[s.rowUnit, { color: colors.textSecondary }]}>W</Text>
            </View>
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <Text style={[s.rowLabel, { color: colors.textPrimary }]}>Hours / Day</Text>
              <TextInput
                style={[s.rowInput, { color: colors.textPrimary }]}
                value={hoursPerDay}
                onChangeText={setHoursPerDay}
                keyboardType="numeric"
                placeholder="e.g. 8"
                placeholderTextColor={colors.textSecondary}
                textAlign="right"
              />
              <Text style={[s.rowUnit, { color: colors.textSecondary }]}>hrs</Text>
            </View>
          </View>

          {/* PRIORITY */}
          <Text style={[s.label, { color: colors.textSecondary }]}>PRIORITY</Text>
          <View style={[s.card, s.priorityRow, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  s.priorityOption,
                  { borderColor: colors.borderDefault },
                  priority === option.value && { backgroundColor: option.color, borderColor: option.color },
                ]}
                onPress={() => setPriority(option.value)}
              >
                <Text style={[
                  s.priorityText,
                  { color: priority === option.value ? "#fff" : colors.textPrimary },
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* PEAK TIME */}
          {priority === "medium" && (
            <>
              <Text style={[s.label, { color: colors.textSecondary }]}>PEAK WINDOW</Text>
              <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
                <View style={[s.row, { borderBottomColor: colors.borderDefault }]}>
                  <Text style={[s.rowLabel, { color: colors.textPrimary }]}>From</Text>
                  <TextInput
                    style={[s.rowInput, { color: colors.textPrimary }]}
                    value={peakStart}
                    onChangeText={setPeakStart}
                    placeholder="14:00"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="right"
                  />
                </View>
                <View style={[s.row, { borderBottomWidth: 0 }]}>
                  <Text style={[s.rowLabel, { color: colors.textPrimary }]}>To</Text>
                  <TextInput
                    style={[s.rowInput, { color: colors.textPrimary }]}
                    value={peakEnd}
                    onChangeText={setPeakEnd}
                    placeholder="18:00"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="right"
                  />
                </View>
              </View>
            </>
          )}

          {/* DELETE */}
          <TouchableOpacity
            style={[s.deleteBtn, { borderColor: colors.danger }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={[s.deleteBtnText, { color: colors.danger }]}>
              Delete Appliance
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
  },
  headerBtn: {
    width: 60,
  },
  headerTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    textAlign: "center",
    flex: 1,
  },
  saveText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    textAlign: "right",
  },
  scroll: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  iconGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
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
  input: {
    fontSize: fontSizes.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    gap: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  rowInput: {
    fontSize: fontSizes.base,
    minWidth: 60,
  },
  rowUnit: {
    fontSize: fontSizes.sm,
    width: 24,
  },
  priorityRow: {
    flexDirection: "row",
    padding: spacing.md,
    gap: spacing.sm,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 0.5,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  deleteBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
});