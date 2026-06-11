import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles as styles } from '../../styles/styles';
import { useTheme } from '../../context/ThemeContext';
import { DayUsage } from '../../hooks/useDailyUsage';
import { useSettings } from '../../context/SettingsContext';
import { fontSizes, fontWeights, spacing } from '../../styles/theme';

interface Props {
  data: DayUsage[];
}

export default function WeeklyChart({ data }: Props) {
  const { colors } = useTheme();
  const { dailyQuota } = useSettings();

  // Scale bars relative to the highest value or dailyQuota, whichever is bigger
  const maxValue = Math.max(...data.map((d) => d.value), dailyQuota);

  // Threshold line position as % from bottom
  const thresholdPct = (dailyQuota / maxValue) * 100;

  if (data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <View style={[styles.thresholdLine, { borderColor: colors.borderChart }]} />
        <View style={styles.chartRow}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <View key={day} style={styles.barContainer}>
              <View style={[styles.bar, { height: '0%', backgroundColor: colors.barInactive }]} />
              <Text style={[styles.barLabel, { color: colors.barLabel }]}>{day}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

 return (
  <View style={{ marginBottom: spacing.xxl }}>

    {/* QUOTA LABEL */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
      <Text style={{ fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.textSecondary }}>
        Weekly Usage
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 16, borderTopWidth: 1.5, borderColor: colors.borderChart, borderStyle: 'dashed' }} />
        <Text style={{ fontSize: fontSizes.xs, color: colors.textSecondary }}>
          {dailyQuota} kWh quota
        </Text>
      </View>
    </View>

    {/* CHART */}
    <View style={[styles.chartContainer, { marginBottom: 0 }]}>
      <View style={[
        styles.thresholdLine,
        {
          borderColor: colors.borderChart,
          bottom: `${thresholdPct}%`,
          top: undefined,
          position: 'absolute',
        },
      ]} />
      <View style={styles.chartRow}>
        {data.map((d, index) => {
          const heightPct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
          const isOverQuota = d.value >= dailyQuota;
          return (
            <View key={index} style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(heightPct, d.value > 0 ? 4 : 0)}%`,
                    backgroundColor: d.isToday
                      ? colors.primary
                      : isOverQuota
                      ? colors.priorityHighText
                      : colors.barInactive,
                  },
                ]}
              />
              <Text style={[
                styles.barLabel,
                { color: d.isToday ? colors.primary : colors.barLabel },
              ]}>
                {d.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  </View>
);
}