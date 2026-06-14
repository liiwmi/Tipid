import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, fontSizes, fontWeights, spacing } from "../../styles/theme";

export default function PrivacyScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const sections = [
    {
      title: "Data We Collect",
      content: "Tipid collects your appliance data, electricity usage, and profile information (name, email, region) to provide personalized energy monitoring.",
    },
    {
      title: "How We Use Your Data",
      content: "Your data is used solely to calculate energy usage, run the optimization algorithm, and display your usage history. We do not sell your data to third parties.",
    },
    {
      title: "Data Storage",
      content: "Your data is stored securely in Supabase with row-level security. Only you can access your own data. A local cache is kept on your device for offline access.",
    },
    {
      title: "Profile & Avatar",
      content: "Your profile photo is stored in Supabase Storage and is only accessible to you. Your display name and region are stored in your account metadata.",
    },
    {
      title: "Your Rights",
      content: "You can delete your account and all associated data at any time by contacting support@tipid.app. You can also edit or clear your profile information from the Profile screen.",
    },
  ];

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[s.safe, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Privacy & Security</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[s.intro, { color: colors.textSecondary }]}>
          Tipid is committed to protecting your privacy. Here's how we handle your data.
        </Text>

        {sections.map((section, i) => (
          <View key={i} style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <View style={s.sectionHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            </View>
            <Text style={[s.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <Text style={[s.footer, { color: colors.textSecondary }]}>
          Last updated: June 2026
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  pageTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },
  intro: { fontSize: fontSizes.base, lineHeight: 22, marginBottom: spacing.lg },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.bold },
  sectionContent: { fontSize: fontSizes.sm, lineHeight: 20, marginLeft: 26 },
  footer: { fontSize: fontSizes.xs, textAlign: "center", marginTop: spacing.xl },
});