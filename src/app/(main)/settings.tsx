// src/app/(main)/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import * as Updates from "expo-updates";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontSize, useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { useProfile } from "../../hooks/useProfile";
import { supabase } from "../../lib/supabase";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";

// ─── FONT SIZE OPTIONS ──────────────────────────────────────
const FONT_OPTIONS: { value: FontSize; label: string; size: number }[] = [
  { value: "small", label: "A", size: 12 },
  { value: "medium", label: "A", size: 15 },
  { value: "large", label: "A", size: 18 },
];

// ─── INLINE EDITABLE ROW ────────────────────────────────────
function EditableRow({
  icon,
  iconBg,
  iconColor,
  title,
  value,
  unit,
  onSave,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  value: number;
  unit: string;
  onSave: (v: number) => void;
}) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const handleSave = () => {
    const parsed = parseFloat(draft);
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert("Invalid value", "Please enter a positive number.");
      setDraft(String(value));
      setEditing(false);
      return;
    }
    onSave(parsed);
    setEditing(false);
  };

  return (
    <View style={[s.row, { borderBottomColor: colors.borderDefault }]}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={s.rowBody}>
        <Text style={[s.rowTitle, { color: colors.textPrimary }]}>{title}</Text>
        {editing ? (
          <TextInput
            style={[
              s.inlineInput,
              { color: colors.textPrimary, borderColor: colors.primary },
            ]}
            value={draft}
            onChangeText={setDraft}
            keyboardType="decimal-pad"
            autoFocus
            onSubmitEditing={handleSave}
            selectTextOnFocus
          />
        ) : (
          <Text style={[s.rowSub, { color: colors.textSecondary }]}>
            {unit === "₱"
              ? `₱${value.toFixed(2)} / kWh`
              : `${value.toFixed(1)} kWh / day`}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => (editing ? handleSave() : setEditing(true))}
        style={[s.editBtn, { borderColor: colors.primary }]}
      >
        <Text style={[s.editBtnText, { color: colors.primary }]}>
          {editing ? "Save" : "Edit"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SECTION LABEL ──────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
      {label.toUpperCase()}
    </Text>
  );
}

// ─── MAIN SCREEN ────────────────────────────────────────────
export default function SettingsScreen() {
  const { colors } = useTheme();
  const {
    electricityRate,
    dailyQuota,
    notifQuota,
    notifPeak,
    notifWeekly,
    fontSize,
    ttsEnabled,
    setElectricityRate,
    setDailyQuota,
    setNotifQuota,
    setNotifPeak,
    setNotifWeekly,
    setFontSize,
    setTtsEnabled,
  } = useSettings();

  // ── TTS PREVIEW ─────────────────────────────────────────
  const previewTts = async (enabled: boolean) => {
    await setTtsEnabled(enabled);
    if (enabled) {
      Speech.speak(
        "Text to speech is now on. Tap any appliance to hear it read aloud.",
        {
          language: "en-PH",
          rate: 0.9,
        },
      );
    } else {
      Speech.stop();
    }
  };

  // ── FONT SIZE CHANGE → RESTART ───────────────────────────
  const handleFontSize = (size: FontSize) => {
    Alert.alert(
      "Restart required",
      "The app will restart to apply the new font size.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          onPress: async () => {
            await setFontSize(size);
            try {
              await Updates.reloadAsync();
            } catch {
              // In Expo Go / dev, reloadAsync may not be available
              Alert.alert(
                "Done",
                "Please restart the app manually to see the change.",
              );
            }
          },
        },
      ],
    );
  };

  // ── SIGN OUT ─────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out of Tipid?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  };

  const cardStyle = [
    s.card,
    { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
  ];
  const rowBorder = { borderBottomColor: colors.borderDefault };
  const { profile } = useProfile();
  const initials = profile.displayName
    ? profile.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  const router = useRouter();
  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[s.safe, { backgroundColor: colors.bgSecondary }]}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <Text style={[s.pageTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>

        {/* PROFILE */}
        <SectionLabel label="Profile" />
        <TouchableOpacity
          style={cardStyle}
          onPress={() => router.push("/(main)/profile" as any)}
        >
          <View style={s.profileRow}>
            {profile.avatarUri ? (
              <Image
                source={{ uri: profile.avatarUri }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <View style={[s.avatar, { backgroundColor: colors.bgListIcon }]}>
                <Text style={[s.avatarInitials, { color: colors.primary }]}>
                  {initials}
                </Text>
              </View>
            )}
            <View style={s.profileInfo}>
              <Text style={[s.profileName, { color: colors.textPrimary }]}>
                {profile.displayName || "Your Name"}
              </Text>
              <Text style={[s.profileEmail, { color: colors.textSecondary }]}>
                {profile.email || "your@email.com"}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {/* ── ELECTRICITY ── */}
        <SectionLabel label="Electricity" />
        <View style={cardStyle}>
          <EditableRow
            icon="flash-outline"
            iconBg="#fff3ec"
            iconColor="#fc5d00"
            title="Electricity rate"
            value={electricityRate}
            unit="₱"
            onSave={setElectricityRate}
          />
          <EditableRow
            icon="stats-chart-outline"
            iconBg="#eaf3de"
            iconColor="#3B6D11"
            title="Daily kWh quota"
            value={dailyQuota}
            unit="kWh"
            onSave={setDailyQuota}
          />
        </View>

        {/* ── NOTIFICATIONS ── */}
        <SectionLabel label="Notifications" />
        <View style={cardStyle}>
          {[
            {
              label: "Quota exceeded alert",
              sub: "Notify when daily limit is hit",
              value: notifQuota,
              setter: setNotifQuota,
            },
            {
              label: "Peak hour reminder",
              sub: "Alert before peak window starts",
              value: notifPeak,
              setter: setNotifPeak,
            },
            {
              label: "Weekly summary",
              sub: "Sunday digest of usage",
              value: notifWeekly,
              setter: setNotifWeekly,
            },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[
                s.row,
                rowBorder,
                i === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[s.rowIcon, { backgroundColor: "#E6F1FB" }]}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#185FA5"
                />
              </View>
              <View style={s.rowBody}>
                <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                  {item.label}
                </Text>
                <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                  {item.sub}
                </Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.setter}
                trackColor={{
                  false: colors.switchTrackOff,
                  true: colors.switchTrackOn,
                }}
                thumbColor={colors.switchThumb}
              />
            </View>
          ))}
        </View>

        {/* ── ACCESSIBILITY ── */}
        <SectionLabel label="Accessibility" />
        <View style={cardStyle}>
          {/* Font size */}
          <View style={[s.row, rowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: "#EEEDFE" }]}>
              <Ionicons name="text-outline" size={18} color="#3C3489" />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                Font size
              </Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Requires app restart
              </Text>
            </View>
            <View style={s.segControl}>
              {FONT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.segOption,
                    { borderColor: colors.borderDefault },
                    fontSize === opt.value && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => handleFontSize(opt.value)}
                >
                  <Text
                    style={[
                      { fontSize: opt.size, fontWeight: fontWeights.bold },
                      fontSize === opt.value
                        ? { color: "#fff" }
                        : { color: colors.textPrimary },
                    ]}
                  >
                    A
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Text to Speech */}
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.rowIcon, { backgroundColor: "#EEEDFE" }]}>
              <Ionicons name="volume-high-outline" size={18} color="#3C3489" />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                Text to speech
              </Text>
              <Text style={[s.rowSub, { color: colors.textSecondary }]}>
                Tap any appliance to hear it read aloud
              </Text>
            </View>
            <Switch
              value={ttsEnabled}
              onValueChange={previewTts}
              trackColor={{
                false: colors.switchTrackOff,
                true: colors.switchTrackOn,
              }}
              thumbColor={colors.switchThumb}
            />
          </View>
        </View>

        {/* ── ABOUT ── */}
        <SectionLabel label="About" />
        <View style={cardStyle}>
          <View style={[s.row, rowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                Version
              </Text>
            </View>
            <View style={[s.versionBadge, { backgroundColor: "#E6F1FB" }]}>
              <Text style={s.versionBadgeText}>1.0.0</Text>
            </View>
          </View>

          <View style={[s.row, rowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={s.rowBody}>
              <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                Privacy policy
              </Text>
            </TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </View>

          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="heart-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <TouchableOpacity style={s.rowBody}>
              <Text style={[s.rowTitle, { color: colors.textPrimary }]}>
                Rate Tipid
              </Text>
            </TouchableOpacity>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </View>
        </View>

        {/* ── SIGN OUT ── */}
        <TouchableOpacity
          style={[s.signOutBtn, { borderColor: colors.danger }]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[s.signOutText, { color: colors.danger }]}>
            Sign out of Tipid
          </Text>
        </TouchableOpacity>

        <Text style={[s.footer, { color: colors.textSecondary }]}>
          Tipid · Made with 🧡 in the Philippines
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  pageTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    gap: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  rowSub: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  inlineInput: {
    fontSize: fontSizes.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    width: 90,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 0.5,
  },
  editBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  // Profile
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },
  // Font seg
  segControl: {
    flexDirection: "row",
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    gap: 3,
  },
  segOption: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.sm,
    borderWidth: 0.5,
  },
  // About
  versionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  versionBadgeText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: "#0C447C",
  },
  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 0.5,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    marginTop: spacing.xl,
  },
  signOutText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  footer: {
    textAlign: "center",
    fontSize: fontSizes.xs,
    marginTop: spacing.xl,
  },
});
