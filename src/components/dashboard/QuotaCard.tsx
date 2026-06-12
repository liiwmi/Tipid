import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { fontSizes, fontWeights, spacing, borderRadius } from '../../styles/theme';

interface Props {
  totalDailyKwh: number;
  totalDailyCost: number;
  progressWidth: number;
  appliances?: { watts: number; is_active: boolean }[];
}

function getProgressColor(pct: number): string {
  if (pct >= 100) return '#c62828';
  if (pct >= 75)  return '#f57f17';
  if (pct >= 50)  return '#f9a825';
  return '#2e7d32';
}

function estimateHoursLeft(
  totalDailyKwh: number,
  dailyQuota: number,
  appliances: { watts: number; is_active: boolean }[] = []
): string | null {
  const remaining = dailyQuota - totalDailyKwh;
  if (remaining <= 0) return null;

  const activeWatts = appliances
    .filter((a) => a.is_active)
    .reduce((sum, a) => sum + a.watts, 0);

  if (activeWatts === 0) return null;

  const hoursLeft = (remaining * 1000) / activeWatts;
  if (hoursLeft >= 24) return null;

  const h = Math.floor(hoursLeft);
  const m = Math.round((hoursLeft - h) * 60);

  if (h === 0) return `~${m}m until quota`;
  if (m === 0) return `~${h}h until quota`;
  return `~${h}h ${m}m until quota`;
}

export default function QuotaCard({ totalDailyKwh, totalDailyCost, progressWidth, appliances = [] }: Props) {
  const { colors } = useTheme();
  const { dailyQuota, electricityRate, setElectricityRate } = useSettings();

  const [editingRate, setEditingRate] = useState(false);
  const [draftRate, setDraftRate] = useState(String(electricityRate));

  const pct = Math.min(progressWidth, 100);
  const progressColor = getProgressColor(pct);
  const remaining = Math.max(dailyQuota - totalDailyKwh, 0);
  const isOver = totalDailyKwh >= dailyQuota;
  const timeLabel = estimateHoursLeft(totalDailyKwh, dailyQuota, appliances);

  const handleSaveRate = () => {
    const v = parseFloat(draftRate);
    if (!isNaN(v) && v > 0) {
      setElectricityRate(v);
    } else {
      setDraftRate(String(electricityRate));
    }
    setEditingRate(false);
  };

  return (
    <View style={[s.card, { backgroundColor: colors.bgCard }]}>

      {/* HEADER */}
      <Text style={[s.cardTitle, { color: colors.textSecondary }]}>Daily Quota Status</Text>

      {/* MAIN VALUE */}
      <View style={s.valueRow}>
        <Text style={[s.mainValue, { color: colors.textPrimary }]}>
          {totalDailyKwh.toFixed(2)}
          <Text style={[s.mainUnit, { color: colors.textSecondary }]}> kWh</Text>
        </Text>
        <View style={[s.pctBadge, { backgroundColor: progressColor + '22' }]}>
          <Text style={[s.pctText, { color: progressColor }]}>
            {pct.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* PROGRESS BAR */}
      <View style={[s.track, { backgroundColor: colors.progressTrack }]}>
        <View style={[s.fill, { width: `${pct}%`, backgroundColor: progressColor }]} />
      </View>

      {/* FOOTER ROW */}
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Text style={[s.footerLabel, { color: colors.textSecondary }]}>
            ₱{totalDailyCost.toFixed(2)} est. cost
          </Text>
          {timeLabel && (
            <Text style={[s.footerLabel, { color: progressColor }]}>
              {timeLabel}
            </Text>
          )}
        </View>
        <View style={s.footerRight}>
          {isOver ? (
            <Text style={[s.remainingText, { color: '#c62828' }]}>
              +{(totalDailyKwh - dailyQuota).toFixed(2)} kWh over
            </Text>
          ) : (
            <Text style={[s.remainingText, { color: progressColor }]}>
              {remaining.toFixed(2)} kWh left
            </Text>
          )}
          <Text style={[s.quotaLimit, { color: colors.textSecondary }]}>
            of {dailyQuota.toFixed(1)} kWh
          </Text>
        </View>
      </View>

      {/* DIVIDER */}
      <View style={[s.divider, { backgroundColor: colors.borderDefault }]} />

      {/* ELECTRICITY RATE ROW */}
      <View style={s.rateRow}>
        <Ionicons name="flash-outline" size={16} color={colors.textSecondary} />
        <Text style={[s.rateLabel, { color: colors.textSecondary }]}>
          Electricity rate today
        </Text>
        <View style={s.rateRight}>
          {editingRate ? (
            <TextInput
              style={[s.rateInput, {
                color: colors.textPrimary,
                borderColor: colors.primary,
                backgroundColor: colors.bgInput,
              }]}
              value={draftRate}
              onChangeText={setDraftRate}
              keyboardType="decimal-pad"
              autoFocus
              onSubmitEditing={handleSaveRate}
              selectTextOnFocus
            />
          ) : (
            <Text style={[s.rateValue, { color: colors.textPrimary }]}>
              ₱{electricityRate.toFixed(2)}/kWh
            </Text>
          )}
          <TouchableOpacity
            onPress={() => editingRate ? handleSaveRate() : setEditingRate(true)}
            style={[s.editBtn, { borderColor: colors.primary }]}
          >
            <Text style={[s.editBtnText, { color: colors.primary }]}>
              {editingRate ? 'Save' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  mainValue: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
  },
  mainUnit: {
    fontSize: fontSizes.lg,
  },
  pctBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  pctText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  track: {
    height: 8,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  footerLeft: { gap: 2 },
  footerRight: { alignItems: 'flex-end', gap: 2 },
  footerLabel: { fontSize: fontSizes.sm },
  remainingText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
  },
  quotaLimit: { fontSize: fontSizes.xs },
  divider: {
    height: 0.5,
    marginVertical: spacing.sm,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateLabel: {
    fontSize: fontSizes.sm,
    flex: 1,
  },
  rateRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rateValue: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  rateInput: {
    fontSize: fontSizes.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    width: 80,
  },
  editBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 0.5,
  },
  editBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
});