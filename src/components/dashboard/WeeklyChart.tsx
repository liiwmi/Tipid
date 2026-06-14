import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSettings } from "../../context/SettingsContext";
import { useTheme } from "../../context/ThemeContext";
import { DayUsage } from "../../hooks/useDailyUsage";
import { fontSizes, fontWeights, spacing } from "../../styles/theme";

const CHART_HEIGHT = 110;

interface Props {
  data: DayUsage[];
}

function getLast7Days(): { day: string; isToday: boolean }[] {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().toISOString().split("T")[0];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: days[d.getDay()],
      isToday: d.toISOString().split("T")[0] === today,
    };
  });
}

export default function WeeklyChart({ data }: Props) {
  const { dailyQuota } = useSettings();
  const { colors } = useTheme();

  const isEmpty = data.length === 0;
  const displayData: DayUsage[] = isEmpty
    ? getLast7Days().map((d) => ({ ...d, value: 0 }))
    : data;

  const maxValue = Math.max(...displayData.map((d) => d.value), dailyQuota);
  const thresholdPct = (dailyQuota / maxValue) * 100;
  const totalWeekKwh = displayData.reduce((sum, d) => sum + d.value, 0);

  return (
    <View style={s.container}>
      {/* HEADER */}
      <Text style={[s.label, { color: colors.textSecondary }]}>
        Weekly Usage
      </Text>
      <View style={s.valueRow}>
        <Text style={[s.value, { color: colors.textPrimary }]}>
          {totalWeekKwh.toFixed(1)}
          <Text style={[s.valueUnit, { color: colors.textSecondary }]}>
            {" "}kWh
          </Text>
        </Text>
      </View>
      <Text style={[s.sub, { color: colors.textSecondary }]}>
        this week · {dailyQuota.toFixed(1)} kWh daily quota
      </Text>

      {/* CHART */}
      <View style={s.chartArea}>
        {/* THRESHOLD LINE */}
        <View
          style={[
            s.thresholdLine,
            { bottom: (thresholdPct / 100) * CHART_HEIGHT + 20 },
          ]}
        >
          <View
            style={[s.dashedLine, { borderColor: colors.borderSecondary }]}
          />
          <Text style={[s.thresholdLabel, { color: colors.textSecondary }]}>
            {dailyQuota.toFixed(1)} kWh
          </Text>
        </View>

        {/* BARS */}
        <View style={s.barsRow}>
          {displayData.map((d, i) => {
            const heightPct =
              maxValue > 0
                ? Math.max((d.value / maxValue) * 100, d.value > 0 ? 5 : 0)
                : 0;
            const isOver = d.value >= dailyQuota;

            const barColors: [string, string, string] = d.isToday
              ? ["#ffea9d", "#f68d50", "#f86014"]
              : isOver
              ? ["#c0c0c0", "#a0a0a0", "#808080"]
              : ["#e0e0e0", "#cccccc", "#b8b8b8"];

            return (
              <View key={i} style={s.barWrap}>
                <View style={[s.barOuter, { height: CHART_HEIGHT }]}>
                  <LinearGradient
                    colors={barColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      s.barInner,
                      { height: (heightPct / 100) * CHART_HEIGHT },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    s.dayLabel,
                    { color: d.isToday ? "#fc5d00" : colors.textSecondary },
                    d.isToday && s.dayLabelToday,
                  ]}
                >
                  {d.day}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* LEGEND */}
      <View style={s.legend}>
        {[
          { color: "#fc5d00", label: "Today" },
          { color: "#a0a0a0", label: "Over quota" },
          { color: "#cccccc", label: "Under quota" },
        ].map((item) => (
          <View key={item.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: item.color }]} />
            <Text style={[s.legendText, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: spacing.xxl,
    marginTop: spacing.sm,
  },
  label: {
    fontSize: fontSizes.sm,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 2,
  },
  value: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
  },
  valueUnit: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
  },
  sub: {
    fontSize: fontSizes.xs,
    marginBottom: spacing.lg,
  },
  chartArea: {
    position: "relative",
    marginBottom: spacing.md,
  },
  thresholdLine: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  thresholdLabel: {
    fontSize: fontSizes.xs,
    marginLeft: 4,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: CHART_HEIGHT + 20,
    paddingTop: 10,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    height: CHART_HEIGHT + 20,
    justifyContent: "flex-end",
  },
  barOuter: {
    width: "100%",
    justifyContent: "flex-end",
    borderRadius: 4,
    overflow: "hidden",
  },
  barInner: {
    width: "100%",
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: fontSizes.xs,
  },
  dayLabelToday: {
    color: "#fc5d00",
    fontWeight: fontWeights.bold,
  },
  legend: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSizes.xs,
  },
});