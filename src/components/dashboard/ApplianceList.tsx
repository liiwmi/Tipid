import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles as styles } from '../../styles/styles';
import { Appliance } from '../../types/appliance';
import { fontSizes, fontWeights, spacing, borderRadius } from '../../styles/theme';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  appliances: Appliance[];
  loading: boolean;
}

export default function ApplianceList({ appliances, loading }: Props) {
  const { colors } = useTheme();

  const PRIORITY_CONFIG = {
    low:    { label: 'Low',    bg: colors.priorityLowBg,  text: colors.priorityLowText },
    medium: { label: 'Medium', bg: colors.priorityMedBg,  text: colors.priorityMedText },
    high:   { label: 'High',   bg: colors.priorityHighBg, text: colors.priorityHighText },
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ margin: 20 }} />;
  }

  if (appliances.length === 0) {
    return (
      <View style={listStyles.emptyContainer}>
        <Ionicons name="flash-outline" size={40} color={colors.borderDefault} />
        <Text style={[listStyles.emptyText, { color: colors.textSecondary }]}>
          No appliances added yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.listContainer, { backgroundColor: colors.bgCard }]}>
      {appliances.map((app) => {
        const priority = PRIORITY_CONFIG[app.priority] ?? PRIORITY_CONFIG.low;
        return (
          <View key={app.id} style={[styles.listItem, { borderBottomColor: colors.borderList }]}>
            <View style={[styles.listIconWrapper, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons name={app.icon as any} size={22} color={colors.textCardTitle} />
            </View>
            <View style={styles.listTextWrapper}>
              <Text style={[styles.listTitle, { color: colors.textPrimary }]}>{app.name}</Text>
              <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                {app.watts}W • {app.hours_per_day} hrs/day
                {app.peak_start && app.peak_end ? ` • Peak ${app.peak_start}–${app.peak_end}` : ''}
              </Text>
            </View>
            <View style={[listStyles.badge, { backgroundColor: priority.bg }]}>
              <Text style={[listStyles.badgeText, { color: priority.text }]}>
                {priority.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const listStyles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  badgeText: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.base,
  },
});