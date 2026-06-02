import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles as styles } from '../../styles/styles';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  applianceCount: number;
  peakHour?: string;
}

export default function MetricsGrid({ applianceCount, peakHour = '2pm' }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.gridRow}>
      <View style={[styles.gridCard, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textCardTitle }]}>Active Appliances</Text>
        <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{applianceCount}</Text>
      </View>
      <View style={[styles.gridCard, { backgroundColor: colors.bgCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textCardTitle }]}>Peak Hours</Text>
        <Text style={[styles.gridValue, { color: colors.textPrimary }]}>{peakHour}</Text>
      </View>
    </View>
  );
}