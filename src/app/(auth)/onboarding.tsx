import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "../../components/common/Gradientbackground";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppliances } from "../../hooks/useAppliance";
import { useProfileContext } from "../../context/ProfileContext";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";
// ── REGION RATES ─────────────────────────────────────────────
const REGION_RATES: Record<string, number> = {
  Luzon: 11.8,
  Visayas: 10.9,
  Mindanao: 9.5,
};

const REGIONS = ["Luzon", "Visayas", "Mindanao"] as const;

// ── PRESET APPLIANCES ─────────────────────────────────────────
const PRESET_APPLIANCES = [
  {
    name: "Air Conditioner",
    watts: 1500,
    icon: "snow-outline",
    hours_per_day: 8,
    priority: "high" as const,
  },
  {
    name: "Refrigerator",
    watts: 150,
    icon: "cube-outline",
    hours_per_day: 24,
    priority: "high" as const,
  },
  {
    name: "Electric Fan",
    watts: 60,
    icon: "flash-outline",
    hours_per_day: 8,
    priority: "medium" as const,
  },
  {
    name: "Television",
    watts: 120,
    icon: "tv-outline",
    hours_per_day: 6,
    priority: "medium" as const,
  },
  {
    name: "Washing Machine",
    watts: 500,
    icon: "water-outline",
    hours_per_day: 1,
    priority: "medium" as const,
  },
  {
    name: "Electric Kettle",
    watts: 1200,
    icon: "cafe-outline",
    hours_per_day: 1,
    priority: "low" as const,
  },
  {
    name: "Laptop / PC",
    watts: 150,
    icon: "desktop-outline",
    hours_per_day: 6,
    priority: "medium" as const,
  },
  {
    name: "WiFi Router",
    watts: 10,
    icon: "wifi-outline",
    hours_per_day: 24,
    priority: "low" as const,
  },
  {
    name: "Phone Charger",
    watts: 20,
    icon: "battery-charging-outline",
    hours_per_day: 3,
    priority: "low" as const,
  },
  {
    name: "Rice Cooker",
    watts: 700,
    icon: "restaurant-outline",
    hours_per_day: 1,
    priority: "medium" as const,
  },
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setDailyQuota, setElectricityRate } = useSettings();
  const { saveProfile, profile } = useProfileContext();
  const { addAppliance } = useAppliances();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState("");

  // Step 2
  const [region, setRegion] = useState<(typeof REGIONS)[number] | "">("");

  // Step 3
  const [monthlyKwh, setMonthlyKwh] = useState("");

  // Step 4
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(
    new Set(["Refrigerator", "WiFi Router"]),
  );

  const toggleAppliance = (name: string) => {
    setSelectedAppliances((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const goNext = () => {
    if (step === 1 && !displayName.trim()) {
      Alert.alert("Hold on", "Please enter your display name.");
      return;
    }
    if (step === 2 && !region) {
      Alert.alert("Hold on", "Please select your region.");
      return;
    }
    if (step === 3) {
      const val = parseFloat(monthlyKwh);
      if (!monthlyKwh || isNaN(val) || val <= 0) {
        Alert.alert("Hold on", "Please enter a valid monthly kWh usage.");
        return;
      }
    }
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      const updatedProfile = {
        ...profile,
        displayName: displayName.trim(),
        region: region as any,
      };
      console.log("Saving profile:", updatedProfile);
      await saveProfile(updatedProfile);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log("User metadata after save:", user?.user_metadata);

      if (region) {
        await setElectricityRate(REGION_RATES[region]);
      }

      const daily = parseFloat(monthlyKwh) / 30;
      await setDailyQuota(parseFloat(daily.toFixed(2)));

      const toAdd = PRESET_APPLIANCES.filter((a) =>
        selectedAppliances.has(a.name),
      );
      for (const appliance of toAdd) {
        await addAppliance({
          ...appliance,
          peak_start: null,
          peak_end: null,
          original_priority: null,
          is_active: true,
        });
      }

      router.replace("/(main)/" as any);
    } catch (e) {
      console.log("Error:", e);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  // ── STEP INDICATOR ────────────────────────────────────────
  const StepIndicator = () => (
    <View style={s.stepRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            s.stepDot,
            {
              backgroundColor:
                i + 1 <= step ? colors.primary : colors.borderDefault,
              width: i + 1 === step ? 24 : 8,
            },
          ]}
        />
      ))}
    </View>
  );

  // ── STEP 1 — NAME ─────────────────────────────────────────
  const Step1 = () => (
    <View style={s.stepContent}>
      <Text style={[s.emoji]}>👋</Text>
      <Text style={[s.stepTitle, { color: colors.textPrimary }]}>
        What should we call you?
      </Text>
      <Text style={[s.stepSub, { color: colors.textSecondary }]}>
        This is how Tipid will greet you on your dashboard.
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.borderSecondary,
            color: colors.textPrimary,
            backgroundColor: colors.bgInput,
            marginTop: spacing.lg,
          },
        ]}
        placeholder="e.g. Juan dela Cruz"
        placeholderTextColor={colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
        autoFocus
      />
    </View>
  );

  // ── STEP 2 — REGION ───────────────────────────────────────
  const Step2 = () => (
    <View style={s.stepContent}>
      <Text style={s.emoji}>📍</Text>
      <Text style={[s.stepTitle, { color: colors.textPrimary }]}>
        Where are you located?
      </Text>
      <Text style={[s.stepSub, { color: colors.textSecondary }]}>
        Your region determines the default electricity rate used for cost
        calculations.
      </Text>
      <View style={s.regionGrid}>
        {REGIONS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[
              s.regionCard,
              {
                borderColor: colors.borderDefault,
                backgroundColor: colors.bgCard,
              },
              region === r && {
                borderColor: colors.primary,
                backgroundColor: colors.primary,
              },
            ]}
            onPress={() => setRegion(r)}
          >
            <Text
              style={[
                s.regionName,
                { color: region === r ? "#fff" : colors.textPrimary },
              ]}
            >
              {r}
            </Text>
            <Text
              style={[
                s.regionRate,
                { color: region === r ? "#ffffffaa" : colors.textSecondary },
              ]}
            >
              ₱{REGION_RATES[r].toFixed(2)} / kWh
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ── STEP 3 — QUOTA ────────────────────────────────────────
  const Step3 = () => (
    <View style={s.stepContent}>
      <Text style={s.emoji}>⚡</Text>
      <Text style={[s.stepTitle, { color: colors.textPrimary }]}>
        What's your monthly kWh usage?
      </Text>
      <Text style={[s.stepSub, { color: colors.textSecondary }]}>
        Check your electric bill for this number. Tipid will convert it to a
        daily quota to track your usage.
      </Text>
      <View
        style={[
          s.quotaInputRow,
          {
            backgroundColor: colors.bgInput,
            borderColor: colors.borderSecondary,
          },
        ]}
      >
        <TextInput
          style={[s.quotaInput, { color: colors.textPrimary }]}
          placeholder="e.g. 200"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          value={monthlyKwh}
          onChangeText={setMonthlyKwh}
          autoFocus
        />
        <Text style={[s.quotaUnit, { color: colors.textSecondary }]}>
          kWh / month
        </Text>
      </View>
      {monthlyKwh &&
        !isNaN(parseFloat(monthlyKwh)) &&
        parseFloat(monthlyKwh) > 0 && (
          <View
            style={[
              s.quotaPreview,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={[s.quotaPreviewText, { color: colors.textSecondary }]}>
              That's{" "}
              <Text
                style={{ color: colors.primary, fontWeight: fontWeights.bold }}
              >
                {(parseFloat(monthlyKwh) / 30).toFixed(2)} kWh / day
              </Text>{" "}
              — your daily quota.
            </Text>
          </View>
        )}
    </View>
  );

  // ── STEP 4 — APPLIANCES ───────────────────────────────────
  const Step4 = () => (
    <View style={s.stepContent}>
      <Text style={s.emoji}>🏠</Text>
      <Text style={[s.stepTitle, { color: colors.textPrimary }]}>
        What appliances do you use?
      </Text>
      <Text style={[s.stepSub, { color: colors.textSecondary }]}>
        Select the ones in your home. You can add more or edit them later.
      </Text>
      <ScrollView
        style={{ marginTop: spacing.lg }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {PRESET_APPLIANCES.map((appliance) => {
          const selected = selectedAppliances.has(appliance.name);
          return (
            <TouchableOpacity
              key={appliance.name}
              style={[
                s.applianceRow,
                {
                  backgroundColor: selected
                    ? colors.primary + "18"
                    : colors.bgCard,
                  borderColor: selected ? colors.primary : colors.borderDefault,
                },
              ]}
              onPress={() => toggleAppliance(appliance.name)}
            >
              <View
                style={[
                  s.applianceIcon,
                  {
                    backgroundColor: selected
                      ? colors.primary + "30"
                      : colors.bgListIcon,
                  },
                ]}
              >
                <Ionicons
                  name={appliance.icon as any}
                  size={20}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              </View>
              <View style={s.applianceInfo}>
                <Text style={[s.applianceName, { color: colors.textPrimary }]}>
                  {appliance.name}
                </Text>
                <Text style={[s.applianceSub, { color: colors.textSecondary }]}>
                  {appliance.watts}W · {appliance.hours_per_day}h/day
                </Text>
              </View>
              <View
                style={[
                  s.checkbox,
                  {
                    backgroundColor: selected ? colors.primary : "transparent",
                    borderColor: selected
                      ? colors.primary
                      : colors.borderDefault,
                  },
                ]}
              >
                {selected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[s.safe, { backgroundColor: "transparent" }]}
      >
        {/* STEP INDICATOR */}
        <StepIndicator />

        {/* CONTENT */}
        <View style={s.content}>
          {step === 1 && <Step1 />}
          {step === 2 && <Step2 />}
          {step === 3 && <Step3 />}
          {step === 4 && <Step4 />}
        </View>

        {/* FOOTER */}
        <View style={s.footer}>
          {step > 1 && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setStep((s) => s - 1)}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              s.nextBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.6 },
              step === 1 && { marginLeft: "auto" },
            ]}
            onPress={step === TOTAL_STEPS ? handleFinish : goNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.nextBtnText}>
                  {step === TOTAL_STEPS ? "Let's go!" : "Continue"}
                </Text>
                {step < TOTAL_STEPS && (
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  stepRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
    lineHeight: 34,
  },
  stepSub: {
    fontSize: fontSizes.base,
    lineHeight: 22,
  },
  // Region
  regionGrid: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  regionCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
  },
  regionName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
  },
  regionRate: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  // Quota
  quotaInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  quotaInput: {
    flex: 1,
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    paddingVertical: spacing.md,
  },
  quotaUnit: {
    fontSize: fontSizes.sm,
  },
  quotaPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
  },
  quotaPreviewText: {
    fontSize: fontSizes.sm,
    flex: 1,
  },
  // Appliances
  applianceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  applianceIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  applianceInfo: { flex: 1 },
  applianceName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  applianceSub: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  nextBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: "#fff",
  },
});
