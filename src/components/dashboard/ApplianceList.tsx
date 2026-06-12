import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { globalStyles as styles } from "../../styles/styles";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";
import { Appliance } from "../../types/appliance";

interface Props {
  appliances: Appliance[];
  loading: boolean;
  onToggle?: (id: string) => void;
}

export default function ApplianceList({
  appliances,
  loading,
  onToggle,
}: Props) {
  const { colors } = useTheme();

  const PRIORITY_CONFIG = {
    low: {
      label: "Low",
      bg: colors.priorityLowBg,
      text: colors.priorityLowText,
    },
    medium: {
      label: "Medium",
      bg: colors.priorityMedBg,
      text: colors.priorityMedText,
    },
    high: {
      label: "High",
      bg: colors.priorityHighBg,
      text: colors.priorityHighText,
    },
  };

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ margin: 20 }}
      />
    );
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
          <View
            key={app.id}
            style={[styles.listItem, { borderBottomColor: colors.borderList }]}
          >
            <View
              style={[
                styles.listIconWrapper,
                {
                  backgroundColor: app.is_active
                    ? colors.bgListIcon
                    : colors.borderDefault,
                },
              ]}
            >
              <Ionicons
                name={app.icon as any}
                size={22}
                color={
                  app.is_active ? colors.textCardTitle : colors.textSecondary
                }
              />
            </View>
            <View style={styles.listTextWrapper}>
              <Text
                style={[
                  styles.listTitle,
                  {
                    color: app.is_active
                      ? colors.textPrimary
                      : colors.textSecondary,
                  },
                ]}
              >
                {app.name}
              </Text>
              <Text style={[styles.listSub, { color: colors.textSecondary }]}>
                {app.watts}W • {app.hours_per_day} hrs/day
                {app.peak_start && app.peak_end
                  ? ` • Peak ${app.peak_start}–${app.peak_end}`
                  : ""}
              </Text>
            </View>
            <View style={listStyles.rowRight}>
              <View
                style={[listStyles.badge, { backgroundColor: priority.bg }]}
              >
                <Text style={[listStyles.badgeText, { color: priority.text }]}>
                  {priority.label}
                </Text>
              </View>
              {onToggle && (
                <Switch
                  value={app.is_active}
                  onValueChange={() => onToggle(app.id)}
                  trackColor={{
                    false: colors.switchTrackOff,
                    true: colors.switchTrackOn,
                  }}
                  thumbColor={colors.switchThumb}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              )}
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
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.base,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
