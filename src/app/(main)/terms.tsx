// src/app/(main)/terms.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import {
    borderRadius,
    fontSizes,
    fontWeights,
    spacing,
} from "../../styles/theme";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: "By downloading, installing, accessing, or using the TIPID mobile app, you agree to comply with these Terms and Conditions. Please do not use the App if you disagree with any part of these Terms.\n\nTIPID is an academic project created as part of the Design and Analysis of Algorithms course. When you use the App, you are fully aware of and agree to its experimental and educational character.",
  },
  {
    title: "2. Description of Service",
    body: "TIPID is a mobile application that enables users to control their household electricity usage by suggesting which appliances to leave ON or switch OFF based on:\n\n• User-determined appliance wattages, priorities, and time-of-day restrictions\n• User-set budget limit (in Philippine Peso)\n• User-input electricity rate (in PHP per kWh)\n\nTIPID delivers suggestions based on a Depth-First Branch and Bound algorithm applied to a 0/1 Knapsack problem. TIPID is only a simulation and advice tool — it neither controls, traces nor interfaces with any appliance, smart plugs, smart meters, or IoT devices.",
  },
  {
    title: "3. User Accounts",
    body: "3.1. Using TIPID requires an account created through the authentication system provided.\n\n3.2. You must keep your login details confidential and will be liable for all actions taken under your account.\n\n3.3. Upon registering, you shall enter accurate data, including your name and email address.\n\n3.4. You must be the owner of the account or have the authority to manage the household in which the appliance data are entered.",
  },
  {
    title: "4. User Responsibilities",
    body: "By using TIPID, you agree to:\n\n4.1. Ensure that the data you input for appliance wattage, priority levels, peak time windows, monthly budget, and electricity rate are accurate and reasonable.\n\n4.2. Use the priority classification system (High, Medium, Low) judiciously. Label High Priority only for essential appliances (e.g., medical equipment).\n\n4.3. Update your electricity rate input regularly to reflect present utility rates.\n\n4.4. Not rely on TIPID for decisions about life-supporting, medical, or safety-critical equipment.\n\n4.5. Not attempt to reverse-engineer, decompile, tamper with, or exploit the App, its algorithm, or backend services.",
  },
  {
    title: "5. Disclaimers and Limitations",
    body: '5.1. Just Estimates. All results are estimated figures derived from user-supplied data and a simplified mathematical model. These figures do not necessarily correspond to your actual utility bills.\n\n5.2. Excluded Costs. TIPID calculations only account for the cost of producing power. They do not include transmission, system losses, taxes, subsidies, and additional fees.\n\n5.3. Simplified Electrical Model. TIPID considers appliance wattage as a constant value and does not account for inrush current, startup surges, or changing power consumption.\n\n5.4. First Feasible Solution. The algorithm offers a solution that satisfies all constraints but does not look for the single best possible combination among all theoretically possible scenarios.\n\n5.5. Single Household Scope. TIPID is designed for individual household use only.\n\n5.6. No Hardware Control. TIPID will not switch appliances on or off automatically. Manual action is required for all ON/OFF recommendations.\n\n5.7. No Warranty. TIPID is delivered "AS IS" without any warranties, either express or implied.',
  },
  {
    title: "6. Limitation of Liability",
    body: "6.1. Under no circumstances will the TIPID developers be liable for any direct, indirect, incidental, or consequential damages arising from:\n\n• Incorrectly forecasted budget or electricity bill\n• Following appliance ON/OFF suggestions\n• Fault, loss, or damage caused by use or misuse of the App\n• Interruption of services or third-party service complications\n\n6.2. TIPID is an academic work and must not be the only reference in financial planning or safety-critical appliance management.",
  },
  {
    title: "7. Data Privacy and Storage",
    body: "7.1. TIPID gathers and keeps the following data via Firebase/Cloud Firestore:\n\n• Account details (name, email, authentication credentials)\n• Appliance data (name, wattage, priority level, peak time windows)\n• Budget control levels and electricity rates\n• Optimization results and records\n\n7.2. Your data is only used for the App's fundamental operations.\n\n7.3. TIPID does not sell, rent, or share your personal information for advertising or marketing purposes.\n\n7.4. Data is held in Firebase's cloud infrastructure and governed by Firebase's own security policies.\n\n7.5. You can request removal of your account and related data at any moment.",
  },
  {
    title: "8. Intellectual Property",
    body: "8.1. TIPID, its algorithm design, source code, branding, and user interface are the intellectual property of the development team (Group 10) created as part of the Design and Analysis of Algorithms course.\n\n8.2. This App is made available for academic and educational purposes only. Unauthorized commercial use, redistribution, or reproduction is prohibited.",
  },
  {
    title: "9. Changes to the App and Terms",
    body: "9.1. TIPID is a work-in-progress academic project and these Terms may be updated, changed, or terminated without notice.\n\n9.2. By using the App even after changes to these Terms, you indicate acceptance of the amended Terms.",
  },
  {
    title: "10. Termination",
    body: "10.1. We may suspend or terminate your access to TIPID if you misuse the App, breach these Terms, or attempt to hack the system.\n\n10.2. Users can stop using the App and request account deletion anytime.",
  },
  {
    title: "11. Governing Context",
    body: "11.1. These Terms are part of an academic project by students of the Polytechnic University of the Philippines for their Design and Analysis of Algorithms course.\n\n11.2. For any app-related inquiries, users can reach out to the team via the channels mentioned in the App.",
  },
  {
    title: "12. Acknowledgment",
    body: "When you choose to use TIPID, you confirm that you have read, understood, and agreed to these Terms and Conditions, and that you understand that the App is providing a financial and technical solution by way of estimation and recommendation.\n\nTIPID — Technical Integration of Power: Intelligent De-loading\nGroup 10 | Design and Analysis of Algorithms Project",
  },
];

export default function TermsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[s.safe, { backgroundColor: colors.bgSecondary }]}
    >
      {/* Header */}
      <View
        style={[
          s.header,
          {
            borderBottomColor: colors.borderDefault,
            backgroundColor: colors.bgCard,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>
          Terms & Conditions
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top info */}
        <View
          style={[
            s.infoBanner,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary + "40",
            },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: colors.primary }]}>
              TIPID — Technical Integration of Power: Intelligent De-loading
            </Text>
            <Text style={[s.infoSub, { color: colors.textSecondary }]}>
              Last Updated: June 15, 2026
            </Text>
          </View>
        </View>

        {/* Sections */}
        {SECTIONS.map((section, i) => (
          <View
            key={i}
            style={[
              s.section,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.borderDefault,
              },
            ]}
          >
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
              {section.title}
            </Text>
            <Text style={[s.sectionBody, { color: colors.textSecondary }]}>
              {section.body}
            </Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  backBtn: { padding: 4 },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold },
  scroll: { padding: spacing.lg, gap: spacing.md },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  infoTitle: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  infoSub: { fontSize: fontSizes.xs, marginTop: 2 },
  section: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: { fontSize: fontSizes.base, fontWeight: fontWeights.bold },
  sectionBody: { fontSize: fontSizes.sm, lineHeight: 20 },
});
