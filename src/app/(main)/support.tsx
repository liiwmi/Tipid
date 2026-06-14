import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { borderRadius, fontSizes, fontWeights, spacing } from "../../styles/theme";

export default function SupportScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const faqs = [
    { q: "How is my daily quota calculated?", a: "Your daily quota is derived from your monthly kWh usage divided by 30 days. You can update it anytime in Settings." },
    { q: "What does the algorithm do?", a: "Tipid uses a Branch and Bound knapsack algorithm to recommend which appliances to keep on within your electricity budget, maximizing priority." },
    { q: "Why is my data not syncing?", a: "Make sure you have an active internet connection. Tipid saves data offline and syncs automatically when you're back online." },
    { q: "How do peak hours work?", a: "Appliances set to Medium priority can have a peak window. During that window, their priority upgrades to High in the algorithm." },
    { q: "Can I use Tipid without internet?", a: "Yes! Tipid works fully offline. Changes are queued and synced when you reconnect." },
  ];

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={[s.safe, { backgroundColor: colors.bgSecondary }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Help & Support</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>FREQUENTLY ASKED QUESTIONS</Text>
        {faqs.map((faq, i) => (
          <View key={i} style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <View style={s.faqRow}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={[s.question, { color: colors.textPrimary }]}>{faq.q}</Text>
            </View>
            <Text style={[s.answer, { color: colors.textSecondary }]}>{faq.a}</Text>
          </View>
        ))}

        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>CONTACT</Text>
        <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <View style={s.contactRow}>
            <Ionicons name="mail-outline" size={20} color={colors.primary} />
            <Text style={[s.contactText, { color: colors.textPrimary }]}>support@tipid.app</Text>
          </View>
        </View>

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
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  question: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold, flex: 1 },
  answer: { fontSize: fontSizes.sm, lineHeight: 20, marginLeft: 28 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  contactText: { fontSize: fontSizes.base },
});