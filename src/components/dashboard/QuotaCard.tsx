import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles as styles } from '../../styles/styles';
import { DAILY_KWH_LIMIT } from '../../constants/electricity';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  totalDailyKwh: number;
  totalDailyCost: number;
  progressWidth: number;
}

export default function QuotaCard({ totalDailyKwh, totalDailyCost, progressWidth }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.quotaCard, { backgroundColor: colors.bgCard }]}>
      <View style={styles.quotaHeader}>
        <Text style={[styles.cardTitle, { color: colors.textCardTitle }]}>Daily Quota Status</Text>
        <Ionicons name="chevron-up-circle" size={24} color={colors.primary} />
      </View>

      <Text style={[styles.quotaValue, { color: colors.textPrimary }]}>
        {totalDailyKwh.toFixed(1)}{' '}
        <Text style={[styles.quotaSub, { color: colors.textSecondary }]}>
          / {DAILY_KWH_LIMIT} kWh
        </Text>
      </Text>

      <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack }]}>
        <View style={[styles.progressFill, { width: `${progressWidth}%`, backgroundColor: colors.progressFill }]} />
      </View>

      <View style={styles.quotaFooter}>
        <Text style={[styles.quotaFooterText, { color: colors.textSecondary }]}>
          ₱ {totalDailyCost.toFixed(2)} est. cost
        </Text>
      </View>
    </View>
  );
}