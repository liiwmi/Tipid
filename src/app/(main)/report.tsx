import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
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
import { useRecommendations } from "../../hooks/useRecommendation";
import { runOptimization } from "../../services/optimizer";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";

const CACHE_KEY = "@last_optimization_result";

interface OptimizationResult {
  turn_on: string[]; // appliance names
  total_priority_value: number;
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

  const [pruningHistory, setPruningHistory] = useState<any[]>([]);
  const [optSessions, setOptSessions] = useState<any[]>([]);

  const peakQuotaPct = Math.max(
    ...pruningHistory.map(() => 0),
    (totalDailyKwh / dailyQuota) * 100,
  );
  const excessKwh = Math.max(totalDailyKwh - dailyQuota, 0);
  const excessCost = excessKwh * electricityRate;
  const { recommendations, schedule, lastRunAt, runRecommendations } =
    useRecommendations();

  // ── LOAD CACHED RESULT ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed: OptimizationResult = JSON.parse(cached);
          // Guard: old cache may have stored objects instead of names
          const turnOn = (parsed.turn_on ?? [])
            .map((item: any) =>
              typeof item === "string" ? item : (item?.name ?? ""),
            )
            .filter(Boolean);
          setResult({ ...parsed, turn_on: turnOn });
          setHasRun(true);
          if (parsed.timestamp) setLastRun(new Date(parsed.timestamp));
        }
      } catch (_) {}
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const historyRaw = await AsyncStorage.getItem(
            "@tipid_pruning_history",
          );
          const sessionsRaw = await AsyncStorage.getItem(
            "@tipid_optimization_sessions",
          );
          setPruningHistory(historyRaw ? JSON.parse(historyRaw) : []);
          setOptSessions(sessionsRaw ? JSON.parse(sessionsRaw) : []);
        } catch {}
      })();
    }, []),
  );
  // ── RUN OPTIMIZATION ─────────────────────────────────────
  const runOptimizationAuto = useCallback(
    async (isAuto = false) => {
      setLoading(true);
      setTimeout(
        async () => {
          const currentHour = new Date().getHours();
          const parsedBudget = parseFloat(budget);
          const effectiveBudget =
            !isNaN(parsedBudget) && parsedBudget > 0
              ? parsedBudget
              : dailyQuota * electricityRate;

          const raw = runOptimization(
            appliances,
            effectiveBudget,
            electricityRate,
            currentHour,
            totalDailyKwh,
          );

          // Normalise: optimizer returns { turn_on: string[], total_priority_value }
          const res: OptimizationResult = {
            turn_on: (raw.turn_on ?? [])
              .map((item: any) =>
                typeof item === "string" ? item : (item?.name ?? ""),
              )
              .filter(Boolean),
            total_priority_value: raw.total_priority_value,
          };

          const now = new Date();
          const withTimestamp = { ...res, timestamp: now.toISOString() };

          try {
            await AsyncStorage.setItem(
              CACHE_KEY,
              JSON.stringify(withTimestamp),
            );
          } catch (_) {}

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

  // ── COMPUTED ──────────────────────────────────────────────
  const recommendedNames = new Set(result?.turn_on ?? []);

  const optimizedAppliances = appliances.filter((a) =>
    recommendedNames.has(a.name),
  );
  const prunedAppliances = appliances.filter(
    (a) => a.is_active && !recommendedNames.has(a.name),
  );
  const optimizedKwh = optimizedAppliances.reduce(
    (sum, a) => sum + (a.watts * a.hours_per_day) / 1000,
    0,
  );
  const optimizedCost = optimizedKwh * electricityRate;
  const costSavings = totalDailyCost - optimizedCost;
  const maxBar = Math.max(totalDailyKwh, optimizedKwh, dailyQuota, 0.01);
  const totalKwhSaved = pruningHistory.reduce(
    (sum, e) => sum + (e.kwhSaved ?? 0),
    0,
  );
  const totalCostSaved = pruningHistory.reduce(
    (sum, e) => sum + (e.costSaved ?? 0),
    0,
  );
  const totalMinutesGained = pruningHistory.reduce(
    (sum, e) => sum + (e.minutesGained ?? 0),
    0,
  );
  const totalRecommendations = optSessions.reduce(
    (sum, s) => sum + (s.candidates?.length ?? 0),
    0,
  );
  const totalConfirmed = pruningHistory.length;
  const acceptanceRate =
    totalRecommendations > 0
      ? ((totalConfirmed / totalRecommendations) * 100).toFixed(0)
      : "0";
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
        {appliances.some(
          (a) =>
            a.priority === "medium" &&
            a.peak_start !== null &&
            a.peak_end !== null &&
            (() => {
              const hour = new Date().getHours();
              const start = parseInt(a.peak_start!.split(":")[0], 10);
              const end = parseInt(a.peak_end!.split(":")[0], 10);
              return start <= hour && hour < end;
            })(),
        ) && (
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

            {/* RECOMMENDED ON */}
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
            {/* RECOMMENDATIONS */}
            {recommendations.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  RECOMMENDATIONS
                </Text>
                <View style={cardStyle}>
                  {recommendations.map((rec, i) => (
                    <View
                      key={rec.applianceId}
                      style={[
                        s.applianceRow,
                        { borderBottomColor: colors.borderDefault },
                        i === recommendations.length - 1 && {
                          borderBottomWidth: 0,
                        },
                      ]}
                    >
                      <View
                        style={[
                          s.applianceIcon,
                          {
                            backgroundColor:
                              rec.action === "turn_off"
                                ? colors.priorityHighBg
                                : "#eaf3de",
                          },
                        ]}
                      >
                        <Ionicons
                          name={rec.action === "turn_off" ? "power" : "flash"}
                          size={18}
                          color={
                            rec.action === "turn_off"
                              ? colors.priorityHighText
                              : colors.secondary
                          }
                        />
                      </View>
                      <View style={s.applianceInfo}>
                        <Text
                          style={[
                            s.applianceName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {rec.applianceName}
                        </Text>
                        <Text
                          style={[
                            s.applianceSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {rec.reason}
                        </Text>
                        {rec.action === "turn_off" && (
                          <Text
                            style={[
                              s.applianceSub,
                              { color: colors.secondary },
                            ]}
                          >
                            Saves ₱{rec.estimatedCostSaved.toFixed(2)} · +
                            {Math.round(rec.estimatedMinutesGained)}min
                          </Text>
                        )}
                      </View>
                      <View
                        style={[
                          s.statusBadge,
                          {
                            backgroundColor:
                              rec.action === "turn_off"
                                ? colors.priorityHighBg
                                : "#eaf3de",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.statusText,
                            {
                              color:
                                rec.action === "turn_off"
                                  ? colors.priorityHighText
                                  : colors.secondary,
                            },
                          ]}
                        >
                          {rec.action === "turn_off" ? "OFF" : "ON"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* SCHEDULE */}
                <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
                  ENERGY SCHEDULE
                </Text>
                <View style={cardStyle}>
                  {schedule.map((entry, i) => (
                    <View
                      key={entry.applianceId}
                      style={[
                        s.applianceRow,
                        { borderBottomColor: colors.borderDefault },
                        i === schedule.length - 1 && { borderBottomWidth: 0 },
                      ]}
                    >
                      <View
                        style={[
                          s.applianceIcon,
                          {
                            backgroundColor: entry.willExceedQuota
                              ? colors.priorityHighBg
                              : colors.bgListIcon,
                          },
                        ]}
                      >
                        <Ionicons
                          name="time-outline"
                          size={18}
                          color={
                            entry.willExceedQuota
                              ? colors.priorityHighText
                              : colors.textSecondary
                          }
                        />
                      </View>
                      <View style={s.applianceInfo}>
                        <Text
                          style={[
                            s.applianceName,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {entry.applianceName}
                        </Text>
                        <Text
                          style={[
                            s.applianceSub,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {entry.allowedHours != null
                            ? `${entry.allowedHours.toFixed(1)}h allowed`
                            : "No limit"}
                          {entry.recommendedShutoffTime
                            ? ` · shutoff by ${entry.recommendedShutoffTime}`
                            : ""}
                        </Text>
                      </View>
                      {entry.willExceedQuota && (
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
                            RISK
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
            {/* SUGGESTED TO PRUNE */}
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

                {excessKwh > 0 && (
                  <View style={[cardStyle, { marginTop: spacing.sm }]}>
                    <View style={s.statRow}>
                      <View style={s.statItem}>
                        <Text
                          style={[
                            s.statValue,
                            { color: colors.priorityHighText },
                          ]}
                        >
                          {((totalDailyKwh / dailyQuota) * 100).toFixed(1)}%
                        </Text>
                        <Text
                          style={[s.statLabel, { color: colors.textSecondary }]}
                        >
                          current usage
                        </Text>
                      </View>
                      <View
                        style={[
                          s.statDivider,
                          { backgroundColor: colors.borderDefault },
                        ]}
                      />
                      <View style={s.statItem}>
                        <Text
                          style={[
                            s.statValue,
                            { color: colors.priorityHighText },
                          ]}
                        >
                          {excessKwh.toFixed(2)} kWh
                        </Text>
                        <Text
                          style={[s.statLabel, { color: colors.textSecondary }]}
                        >
                          over quota
                        </Text>
                      </View>
                      <View
                        style={[
                          s.statDivider,
                          { backgroundColor: colors.borderDefault },
                        ]}
                      />
                      <View style={s.statItem}>
                        <Text
                          style={[
                            s.statValue,
                            { color: colors.priorityHighText },
                          ]}
                        >
                          ₱{excessCost.toFixed(2)}
                        </Text>
                        <Text
                          style={[s.statLabel, { color: colors.textSecondary }]}
                        >
                          extra cost
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* HOW IT WORKS */}
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
                    {/* SAVINGS SUMMARY */}
                    <Text
                      style={[s.sectionLabel, { color: colors.textSecondary }]}
                    >
                      SAVINGS SUMMARY
                    </Text>
                    <View style={cardStyle}>
                      <View style={s.statRow}>
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.secondary }]}
                          >
                            {totalKwhSaved.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            kWh saved
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statDivider,
                            { backgroundColor: colors.borderDefault },
                          ]}
                        />
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.secondary }]}
                          >
                            ₱{totalCostSaved.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            cost saved
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statDivider,
                            { backgroundColor: colors.borderDefault },
                          ]}
                        />
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.primary }]}
                          >
                            {Math.round(totalMinutesGained)}m
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            time gained
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          s.statRow,
                          {
                            borderTopWidth: 0.5,
                            borderTopColor: colors.borderDefault,
                          },
                        ]}
                      >
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.textPrimary }]}
                          >
                            {totalRecommendations}
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            recommended
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statDivider,
                            { backgroundColor: colors.borderDefault },
                          ]}
                        />
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.textPrimary }]}
                          >
                            {totalConfirmed}
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            confirmed
                          </Text>
                        </View>
                        <View
                          style={[
                            s.statDivider,
                            { backgroundColor: colors.borderDefault },
                          ]}
                        />
                        <View style={s.statItem}>
                          <Text
                            style={[s.statValue, { color: colors.textPrimary }]}
                          >
                            {acceptanceRate}%
                          </Text>
                          <Text
                            style={[
                              s.statLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            acceptance
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* OPTIMIZATION HISTORY */}
                    {pruningHistory.length > 0 && (
                      <>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: spacing.lg,
                          }}
                        >
                          <Text
                            style={[
                              s.sectionLabel,
                              { color: colors.textSecondary, marginTop: 0 },
                            ]}
                          >
                            OPTIMIZATION HISTORY
                          </Text>
                          <TouchableOpacity
                            onPress={async () => {
                              await AsyncStorage.multiRemove([
                                "@tipid_pruning_history",
                                "@tipid_optimization_sessions",
                              ]);
                              setPruningHistory([]);
                              setOptSessions([]);
                            }}
                          >
                            <Text
                              style={{
                                color: colors.danger,
                                fontSize: fontSizes.sm,
                              }}
                            >
                              Clear
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={cardStyle}>
                          {pruningHistory.map((entry, i) => (
                            <View
                              key={entry.id}
                              style={[
                                s.applianceRow,
                                { borderBottomColor: colors.borderDefault },
                                i === pruningHistory.length - 1 && {
                                  borderBottomWidth: 0,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  s.applianceIcon,
                                  { backgroundColor: "#eaf3de" },
                                ]}
                              >
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={18}
                                  color={colors.secondary}
                                />
                              </View>
                              <View style={s.applianceInfo}>
                                <Text
                                  style={[
                                    s.applianceName,
                                    { color: colors.textPrimary },
                                  ]}
                                >
                                  {entry.applianceName}
                                </Text>
                                <Text
                                  style={[
                                    s.applianceSub,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {new Date(entry.timestamp).toLocaleString()} ·{" "}
                                  {entry.kwhSaved?.toFixed(3) ?? "0"} kWh · ₱
                                  {entry.costSaved?.toFixed(2) ?? "0.00"} saved
                                </Text>
                              </View>
                              <View
                                style={[
                                  s.statusBadge,
                                  { backgroundColor: "#eaf3de" },
                                ]}
                              >
                                <Text
                                  style={[
                                    s.statusText,
                                    { color: colors.secondary },
                                  ]}
                                >
                                  +{Math.round(entry.minutesGained ?? 0)}m
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
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
