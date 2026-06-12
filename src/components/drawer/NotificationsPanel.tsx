import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppNotification } from '../../hooks/useNotifications';
import { useTheme } from '../../context/ThemeContext';
import { fontSizes, fontWeights, spacing, borderRadius } from '../../styles/theme';

interface Props {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

const TYPE_CONFIG = {
  quota_exceeded: { icon: 'flash',              color: '#c62828' },
  quota_warning:  { icon: 'warning',            color: '#f57f17' },
  peak_reminder:  { icon: 'time-outline',       color: '#185FA5' },
  offline_pending:{ icon: 'cloud-offline-outline', color: '#888' },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPanel({
  notifications, onMarkAsRead, onMarkAllAsRead, onClear,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[p.container, { backgroundColor: colors.bgSecondary, borderColor: colors.borderDefault }]}>

      {/* HEADER */}
      <View style={p.header}>
        <Text style={[p.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
        <View style={p.headerActions}>
          {notifications.some((n) => !n.read) && (
            <TouchableOpacity onPress={onMarkAllAsRead}>
              <Text style={[p.actionText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={onClear}>
              <Text style={[p.actionText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LIST */}
      <ScrollView
        style={{ maxHeight: 320 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {notifications.length === 0 ? (
          <View style={p.empty}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.borderDefault} />
            <Text style={[p.emptyText, { color: colors.textSecondary }]}>
              You're all caught up
            </Text>
          </View>
        ) : (
          notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.type];
            return (
              <TouchableOpacity
                key={notif.id}
                style={[
                  p.item,
                  { borderBottomColor: colors.borderDefault },
                  !notif.read && { backgroundColor: colors.bgCard },
                ]}
                onPress={() => onMarkAsRead(notif.id)}
              >
                <View style={[p.iconWrap, { backgroundColor: config.color + '22' }]}>
                  <Ionicons name={config.icon as any} size={18} color={config.color} />
                </View>
                <View style={p.itemBody}>
                  <View style={p.itemHeader}>
                    <Text style={[p.itemTitle, { color: colors.textPrimary }]}>
                      {notif.title}
                    </Text>
                    {!notif.read && (
                      <View style={[p.dot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                  <Text style={[p.itemMsg, { color: colors.textSecondary }]}>
                    {notif.message}
                  </Text>
                  <Text style={[p.itemTime, { color: colors.textSecondary }]}>
                    {timeAgo(notif.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const p = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 0.5,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  itemMsg: {
    fontSize: fontSizes.xs,
    lineHeight: 16,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: fontSizes.xs,
  },
});