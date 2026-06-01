import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles as styles } from '../../styles/styles';
import { weeklyData, THRESHOLD } from '../../constants/electricity';
import { useTheme } from '../../context/ThemeContext';

export default function WeeklyChart() {
  const { colors } = useTheme();

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.thresholdLine, { borderColor: colors.borderChart }]} />
      <View style={styles.chartRow}>
        {weeklyData.map((data, index) => (
          <View key={index} style={styles.barContainer}>
            <View
              style={[
                styles.bar,
                {
                  height: `${data.value}%`,
                  backgroundColor: data.value >= THRESHOLD ? colors.barActive : colors.barInactive,
                },
              ]}
            />
            <Text style={[styles.barLabel, { color: colors.barLabel }]}>{data.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}