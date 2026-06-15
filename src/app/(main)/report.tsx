import AlgorithmVisualizer from "@/src/components/report/AlgorithmVisualizer";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { useAppliances } from "../../hooks/useAppliance";
import { runOptimization } from "../../services/optimizer";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PruneStep {
  appliance: string;
  pruned: boolean;
  cum_cost: number;
  budget: number;
  action: string;
}

interface SortedAppliance {
  name: string;
  watts: number;
  hours_per_day: number;
  cost_per_day: number;
  priority: number; // numeric: 3=High, 2=Medium, 1=Low
  scaled_up: boolean;
  is_on: boolean;
}

interface AlgorithmReport {
  sortedAppliances: SortedAppliance[];
  pruningLog: PruneStep[];
  totalCostOnAppliances: number;
  budgetThreshold: number;
  nodesExplored: number;
  totalPossibleNodes: number;
  totalWattageOn: number;
  peakHourActive: boolean;
  currentHour: number;
}

interface OptimizationResult {
  turn_on: string[];
  total_priority_value: number;
  report?: AlgorithmReport;
  timestamp?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_LABEL: Record<number, string> = {
  3: "High",
  2: "Medium",
  1: "Low",
};
const PRIORITY_COLOR: Record<number, string> = {
  3: "#CC3333",
  2: "#E07B00",
  1: "#4CAF50",
};

export default function ReportScreen() {
  const { colors } = useTheme();
  const { appliances, totalDailyKwh, totalDailyCost } = useAppliances();
  const { electricityRate, dailyQuota } = useSettings();

  const [budget, setBudget] = useState(
    String((dailyQuota * electricityRate).toFixed(2)),
  );
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  // ── Load cached result ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadCachedResult = async () => {
      try {
        const cached = await AsyncStorage.getItem("@last_optimization_result");
        if (cached) {
          const parsed = JSON.parse(cached);
          setResult(parsed);
          setHasRun(true);
          setLastRun(new Date(parsed.timestamp));
        }
      } catch (_) {}
    };
    loadCachedResult();
  }, []);

  // ── Run optimization ───────────────────────────────────────────────────────
  const runOptimizationAuto = useCallback(
    async (isAuto = false) => {
      setLoading(true);
      setTimeout(
        async () => {
          const currentHour = new Date().getHours();
          const res = runOptimization(
            appliances,
            parseFloat(budget) || dailyQuota * electricityRate,
            electricityRate,
            currentHour,
          );
          const now = new Date();
          const withTimestamp = { ...res, timestamp: now.toISOString() };
          await AsyncStorage.setItem(
            "@last_optimization_result",
            JSON.stringify(withTimestamp),
          );
          setResult(res);
          setHasRun(true);
          setLastRun(now);
          setLoading(false);
        },
        isAuto ? 0 : 800,
      );
    },
    [appliances, budget, dailyQuota, electricityRate],
  );

  const handleOptimize = () => runOptimizationAuto(false);

  // ── Auto re-run every hour ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hasRun) return;
    const now = new Date();
    const msUntilNextHour =
      (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000;
    const timeout = setTimeout(() => {
      runOptimizationAuto(true);
      const interval = setInterval(
        () => runOptimizationAuto(true),
        60 * 60 * 1000,
      );
      return () => clearInterval(interval);
    }, msUntilNextHour);
    return () => clearTimeout(timeout);
  }, [hasRun, runOptimizationAuto]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const optimizedAppliances = appliances.filter((a) =>
    result?.turn_on.includes(a.name),
  );
  const prunedAppliances = appliances.filter(
    (a) => a.is_active && !result?.turn_on.includes(a.name),
  );
  const optimizedKwh = optimizedAppliances.reduce(
    (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
    0,
  );
  const optimizedCost = optimizedKwh * electricityRate;
  const costSavings = totalDailyCost - optimizedCost;
  const maxBar = Math.max(totalDailyKwh, optimizedKwh, dailyQuota);

  const report = result?.report;
  const pruningEfficiency = report
    ? (
        Math.max(
          0,
          (report.totalPossibleNodes - report.nodesExplored) /
            report.totalPossibleNodes,
        ) * 100
      ).toFixed(1)
    : "0.0";

  const cardStyle = [
    s.card,
    { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
  ];

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[s.safe, { backgroundColor: colors.bgSecondary }]}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <Text style={[s.pageTitle, { color: colors.textPrimary }]}>
          Algorithm Report
        </Text>
        <Text style={[s.pageSub, { color: colors.textSecondary }]}>
          Depth-First Branch & Bound · 0/1 Knapsack
        </Text>
        {lastRun && (
          <Text style={[s.pageSub, { color: colors.textSecondary }]}>
            Last updated:{" "}
            {lastRun.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
        {report?.peakHourActive && (
          <View style={[s.peakBanner, { backgroundColor: colors.primary }]}>
            <Ionicons name="time-outline" size={14} color="#fff" />
            <Text style={s.peakBannerText}>
              Peak Hour Active — Medium priorities upgraded to High
            </Text>
          </View>
        )}

        {/* ── BUDGET INPUT ──────────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          BUDGET
        </Text>
        <View style={cardStyle}>
          <View style={s.budgetRow}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={[s.budgetLabel, { color: colors.textPrimary }]}>
              Daily Budget (₱)
            </Text>
            <TextInput
              style={[
                s.budgetInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.primary,
                  backgroundColor: colors.bgInput,
                },
              ]}
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
              selectTextOnFocus
            />
          </View>
        </View>

        {/* ── RUN BUTTON ────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            s.runBtn,
            { backgroundColor: colors.primary },
            loading && { opacity: 0.7 },
          ]}
          onPress={handleOptimize}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={s.runBtnText}>Run Optimization</Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── CURRENT STATE ─────────────────────────────────────────────────── */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          CURRENT STATE
        </Text>
        <View style={cardStyle}>
          <View style={s.statRow}>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.textPrimary }]}>
                {totalDailyKwh.toFixed(2)}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                kWh / day
              </Text>
            </View>
            <View
              style={[s.statDivider, { backgroundColor: colors.borderDefault }]}
            />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.textPrimary }]}>
                ₱{totalDailyCost.toFixed(2)}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                est. cost
              </Text>
            </View>
            <View
              style={[s.statDivider, { backgroundColor: colors.borderDefault }]}
            />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.textPrimary }]}>
                {appliances.filter((a) => a.is_active).length}
              </Text>
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                active
              </Text>
            </View>
          </View>
        </View>

        {hasRun && result && (
          <>
            {/* ── BAR CHART ─────────────────────────────────────────────────── */}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              USAGE COMPARISON
            </Text>
            <View style={cardStyle}>
              <View style={s.barChart}>
                {[
                  {
                    value: totalDailyKwh,
                    label: "Current",
                    color: colors.priorityHighText,
                  },
                  {
                    value: optimizedKwh,
                    label: "Optimized",
                    color: colors.secondary,
                  },
                  { value: dailyQuota, label: "Quota", color: colors.primary },
                ].map((bar) => (
                  <View key={bar.label} style={s.barGroup}>
                    <Text
                      style={[s.barChartValue, { color: colors.textPrimary }]}
                    >
                      {bar.value.toFixed(1)} kWh
                    </Text>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          {
                            height: `${Math.min((bar.value / maxBar) * 100, 100)}%`,
                            backgroundColor: bar.color,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[s.barChartLabel, { color: colors.textSecondary }]}
                    >
                      {bar.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.legend}>
                {[
                  { color: colors.priorityHighText, label: "Current" },
                  { color: colors.secondary, label: "Optimized" },
                  { color: colors.primary, label: "Quota" },
                ].map((item) => (
                  <View key={item.label} style={s.legendItem}>
                    <View
                      style={[s.legendDot, { backgroundColor: item.color }]}
                    />
                    <Text
                      style={[s.legendText, { color: colors.textSecondary }]}
                    >
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── SAVINGS SUMMARY ───────────────────────────────────────────── */}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              OPTIMIZATION RESULT
            </Text>
            <View style={cardStyle}>
              <View style={s.statRow}>
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.secondary }]}>
                    ₱{costSavings.toFixed(2)}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                    saved
                  </Text>
                </View>
                <View
                  style={[
                    s.statDivider,
                    { backgroundColor: colors.borderDefault },
                  ]}
                />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.primary }]}>
                    {result.total_priority_value.toFixed(0)}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                    priority score
                  </Text>
                </View>
                <View
                  style={[
                    s.statDivider,
                    { backgroundColor: colors.borderDefault },
                  ]}
                />
                <View style={s.statItem}>
                  <Text style={[s.statValue, { color: colors.textPrimary }]}>
                    {result.turn_on.length}
                  </Text>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                    recommended
                  </Text>
                </View>
              </View>
            </View>

            {/* ── ALGORITHM EFFICIENCY ──────────────────────────────────────── */}
            {report && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  ALGORITHM EFFICIENCY
                </Text>
                <View style={cardStyle}>
                  <View style={{ padding: spacing.md, gap: 8 }}>
                    <View style={s.effRow}>
                      <Text
                        style={[s.effLabel, { color: colors.textSecondary }]}
                      >
                        🌳 Total possible nodes (2ⁿ)
                      </Text>
                      <Text style={[s.effValue, { color: colors.textPrimary }]}>
                        {report.totalPossibleNodes}
                      </Text>
                    </View>
                    <View style={s.effRow}>
                      <Text
                        style={[s.effLabel, { color: colors.textSecondary }]}
                      >
                        🔍 Nodes explored (DFS)
                      </Text>
                      <Text style={[s.effValue, { color: colors.textPrimary }]}>
                        {report.nodesExplored}
                      </Text>
                    </View>
                    <View style={s.effRow}>
                      <Text
                        style={[s.effLabel, { color: colors.textSecondary }]}
                      >
                        ✂️ Branches pruned
                      </Text>
                      <Text style={[s.effValue, { color: colors.primary }]}>
                        {pruningEfficiency}%
                      </Text>
                    </View>
                    {/* Progress bar */}
                    <View
                      style={[
                        s.progressTrack,
                        { backgroundColor: colors.borderDefault },
                      ]}
                    >
                      <View
                        style={[
                          s.progressFill,
                          {
                            width:
                              `${Math.max(0, Math.min(100, parseFloat(pruningEfficiency)))}%` as any,
                            backgroundColor: colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[s.effNote, { color: colors.textSecondary }]}>
                      Pre-sorted by value density (Priority ÷ Cost/day) via
                      Merge Sort O(n log n)
                    </Text>
                  </View>
                </View>

                {/* ── SORTED APPLIANCES TABLE ──────────────────────────────── */}
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  APPLIANCES · SORTED BY VALUE DENSITY
                </Text>
                <View style={cardStyle}>
                  {/* Table header */}
                  <View
                    style={[
                      s.tableHeader,
                      { borderBottomColor: colors.borderDefault },
                    ]}
                  >
                    <Text
                      style={[
                        s.tableHeaderCell,
                        { flex: 2.5, color: colors.textSecondary },
                      ]}
                    >
                      Appliance
                    </Text>
                    <Text
                      style={[
                        s.tableHeaderCell,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Priority
                    </Text>
                    <Text
                      style={[
                        s.tableHeaderCell,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ₱/day
                    </Text>
                    <Text
                      style={[
                        s.tableHeaderCell,
                        { color: colors.textSecondary },
                      ]}
                    >
                      State
                    </Text>
                  </View>
                  {report.sortedAppliances.map((a, i) => (
                    <View
                      key={a.name}
                      style={[
                        s.tableRow,
                        { borderBottomColor: colors.borderDefault },
                        i % 2 === 0 && {
                          backgroundColor: colors.bgSecondary + "60",
                        },
                        i === report.sortedAppliances.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View style={{ flex: 2.5 }}>
                        <Text
                          style={[
                            s.tableCellMain,
                            { color: colors.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {a.name}
                        </Text>
                        {a.scaled_up && (
                          <Text style={{ fontSize: 10, color: colors.primary }}>
                            ↑ Peak Hour
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[
                          s.tableCell,
                          { color: PRIORITY_COLOR[a.priority] },
                        ]}
                      >
                        {PRIORITY_LABEL[a.priority] ?? a.priority}
                      </Text>
                      <Text
                        style={[s.tableCell, { color: colors.textPrimary }]}
                      >
                        ₱{a.cost_per_day.toFixed(2)}
                      </Text>
                      <View
                        style={[
                          s.stateBadge,
                          {
                            backgroundColor: a.is_on
                              ? "#eaf3de"
                              : colors.priorityHighBg,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: a.is_on
                              ? colors.secondary
                              : colors.priorityHighText,
                          }}
                        >
                          {a.is_on ? "ON" : "OFF"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* ── DFS PRUNING LOG ──────────────────────────────────────── */}
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  DFS BRANCH & BOUND TRAVERSAL LOG
                </Text>
                <View style={cardStyle}>
                  {report.pruningLog.length === 0 ? (
                    <Text
                      style={[s.emptyText, { color: colors.textSecondary }]}
                    >
                      No log available.
                    </Text>
                  ) : (
                    report.pruningLog.map((step, i) => (
                      <View
                        key={i}
                        style={[
                          s.logRow,
                          { borderBottomColor: colors.borderDefault },
                          i === report.pruningLog.length - 1 && {
                            borderBottomWidth: 0,
                          },
                        ]}
                      >
                        <Text style={s.logIcon}>
                          {step.pruned ? "✂️" : "✅"}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[s.logName, { color: colors.textPrimary }]}
                          >
                            {step.appliance}
                          </Text>
                          <Text
                            style={[
                              s.logDetail,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {step.pruned
                              ? `Pruned — ₱${step.cum_cost.toFixed(4)} > budget ₱${step.budget.toFixed(4)}`
                              : `Included — cumulative: ₱${step.cum_cost.toFixed(4)}`}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}

            {/* ── RECOMMENDED ON ────────────────────────────────────────────── */}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              RECOMMENDED ON
            </Text>
            <View style={cardStyle}>
              {optimizedAppliances.length === 0 ? (
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                  No appliances fit within budget
                </Text>
              ) : (
                optimizedAppliances.map((a, i) => (
                  <View
                    key={a.id}
                    style={[
                      s.applianceRow,
                      { borderBottomColor: colors.borderDefault },
                      i === optimizedAppliances.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    <View
                      style={[s.applianceIcon, { backgroundColor: "#eaf3de" }]}
                    >
                      <Ionicons
                        name={a.icon as any}
                        size={18}
                        color={colors.secondary}
                      />
                    </View>
                    <View style={s.applianceInfo}>
                      <Text
                        style={[s.applianceName, { color: colors.textPrimary }]}
                      >
                        {a.name}
                      </Text>
                      <Text
                        style={[
                          s.applianceSub,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {a.watts}W · {a.hours_per_day}h · ₱
                        {(
                          ((a.watts * a.hours_per_day) / 1000) *
                          electricityRate
                        ).toFixed(2)}
                        /day
                      </Text>
                    </View>
                    <View
                      style={[s.statusBadge, { backgroundColor: "#eaf3de" }]}
                    >
                      <Text style={[s.statusText, { color: colors.secondary }]}>
                        ON
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ── SUGGESTED TO PRUNE ────────────────────────────────────────── */}
            {prunedAppliances.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  SUGGESTED TO PRUNE
                </Text>
                <View style={cardStyle}>
                  {prunedAppliances.map((a, i) => (
                    <View
                      key={a.id}
                      style={[
                        s.applianceRow,
                        { borderBottomColor: colors.borderDefault },
                        i === prunedAppliances.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.applianceIcon,
                          { backgroundColor: colors.priorityHighBg },
                        ]}
                      >
                        <Ionicons
                          name={a.icon as any}
                          size={18}
                          color={colors.priorityHighText}
                        />
                      </View>
                      <View style={s.applianceInfo}>
                        <Text
                          style={[
                            s.applianceName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {a.name}
                        </Text>
                        <Text
                          style={[
                            s.applianceSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {a.watts}W · {a.hours_per_day}h · ₱
                          {(
                            ((a.watts * a.hours_per_day) / 1000) *
                            electricityRate
                          ).toFixed(2)}
                          /day
                        </Text>
                      </View>
                      <View
                        style={[
                          s.statusBadge,
                          { backgroundColor: colors.priorityHighBg },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            { color: colors.priorityHighText },
                          ]}
                        >
                          OFF
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
            {report && <AlgorithmVisualizer report={report} colors={colors} />}
            <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
              HOW IT WORKS
            </Text>
            <View style={cardStyle}>
              {[
                {
                  icon: "analytics-outline",
                  title: "Merge Sort (O n log n)",
                  desc: "Appliances are sorted by value density (Priority ÷ Cost) before the search begins, ensuring the best candidates are explored first.",
                },
                {
                  icon: "git-branch-outline",
                  title: "Depth-First Branch & Bound",
                  desc: "Explores the decision tree using a stack — going deep into include/exclude branches before backtracking, minimising memory usage.",
                },
                {
                  icon: "cut-outline",
                  title: "Budget Pruning",
                  desc: "Any branch where cumulative cost exceeds the daily budget is cut immediately, avoiding unnecessary computation.",
                },
                {
                  icon: "shield-checkmark-outline",
                  title: "High Priority Safeguard",
                  desc: "High priority appliances are always included. The algorithm never explores a branch that excludes an essential appliance.",
                },
                {
                  icon: "time-outline",
                  title: "Peak Hour Scaling",
                  desc: "Medium priority appliances are hard-upgraded to High during user-defined peak hours, protecting time-sensitive devices.",
                },
              ].map((item, i, arr) => (
                <View
                  key={item.title}
                  style={[
                    s.explainRow,
                    { borderBottomColor: colors.borderDefault },
                    i === arr.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View
                    style={[
                      s.explainIcon,
                      { backgroundColor: colors.bgListIcon },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={s.explainBody}>
                    <Text
                      style={[s.explainTitle, { color: colors.textPrimary }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[s.explainDesc, { color: colors.textSecondary }]}
                    >
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  pageTitle: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
  },
  pageSub: { fontSize: fontSizes.sm, marginBottom: 4, marginTop: 4 },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: { borderRadius: borderRadius.lg, borderWidth: 0.5, overflow: "hidden" },
  peakBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  peakBannerText: {
    color: "#fff",
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    gap: spacing.sm,
  },
  budgetLabel: {
    flex: 1,
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  budgetInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fontSizes.base,
    width: 100,
    textAlign: "right",
  },
  runBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  runBtnText: {
    color: "#fff",
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
  },
  statRow: { flexDirection: "row", paddingVertical: spacing.md },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold },
  statLabel: { fontSize: fontSizes.xs, marginTop: 2 },
  statDivider: { width: 0.5, height: "70%", alignSelf: "center" },
  // Bar chart
  barChart: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-end",
    height: 160,
    padding: spacing.md,
    paddingBottom: 0,
  },
  barGroup: {
    alignItems: "center",
    gap: 6,
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: 40,
    height: 100,
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  barFill: { width: "100%", borderRadius: 4 },
  barChartValue: { fontSize: fontSizes.xs, fontWeight: fontWeights.semibold },
  barChartLabel: {
    fontSize: fontSizes.xs,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSizes.xs },
  // Efficiency
  effRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  effLabel: { fontSize: fontSizes.sm, flex: 1 },
  effValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold },
  effNote: { fontSize: fontSizes.xs, fontStyle: "italic", marginTop: 4 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: 4,
  },
  progressFill: { height: "100%", borderRadius: 4 },
  // Table
  tableHeader: {
    flexDirection: "row",
    padding: spacing.sm,
    borderBottomWidth: 0.5,
    paddingHorizontal: spacing.md,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  tableCellMain: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  tableCell: { flex: 1, fontSize: fontSizes.sm },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
  },
  // Pruning log
  logRow: {
    flexDirection: "row",
    padding: spacing.md,
    borderBottomWidth: 0.5,
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  logIcon: { fontSize: 14, marginTop: 1 },
  logName: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold },
  logDetail: { fontSize: fontSizes.xs, marginTop: 2 },
  // Appliance rows
  applianceRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 0.5,
    gap: spacing.sm,
  },
  applianceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  applianceInfo: { flex: 1 },
  applianceName: { fontSize: fontSizes.base, fontWeight: fontWeights.semibold },
  applianceSub: { fontSize: fontSizes.xs, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold },
  emptyText: {
    padding: spacing.lg,
    textAlign: "center",
    fontSize: fontSizes.sm,
  },
  // How it works
  explainRow: {
    flexDirection: "row",
    padding: spacing.md,
    borderBottomWidth: 0.5,
    gap: spacing.md,
  },
  explainIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  explainBody: { flex: 1 },
  explainTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    marginBottom: 4,
  },
  explainDesc: { fontSize: fontSizes.sm, lineHeight: 18 },
});
