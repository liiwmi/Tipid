import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles as styles } from '../../styles/styles';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  applianceCount: number;
  peakLabel: string;
  isInPeak: boolean;
}

export default function MetricsGrid({ applianceCount, peakLabel, isInPeak }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.gridRow}>
      <View style={[styles.gridCard, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textCardTitle }]}>Active Appliances</Text>
        <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{applianceCount}</Text>
      </View>
      <View style={[styles.gridCard, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textCardTitle }]}>Peak Hours</Text>
        <Text style={[styles.gridValue, {
          color: isInPeak ? colors.priorityHighText : colors.textPrimary,
          fontSize: peakLabel.length > 6 ? 18 : 28,
        }]}>
          {peakLabel}
        </Text>
        {isInPeak && (
          <Text style={{ fontSize: 10, color: colors.priorityHighText, marginTop: 2 }}>
            ● ACTIVE NOW
          </Text>
        )}
      </View>
    </View>
  );
}