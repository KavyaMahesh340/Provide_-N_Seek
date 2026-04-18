import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const TYPE_ICONS = {
  task_assigned:  { name: 'checkmark-circle', color: '#6366f1' },
  mentioned:      { name: 'at-circle',        color: '#a78bfa' },
  task_commented: { name: 'chatbubble',        color: '#3b82f6' },
  due_soon:       { name: 'alert-circle',      color: '#f59e0b' },
  task_updated:   { name: 'refresh-circle',    color: '#22c55e' },
  default:        { name: 'notifications',     color: '#64748b' },
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const NotifItem = ({ item, onRead }) => {
  const icon = TYPE_ICONS[item.type] || TYPE_ICONS.default;
  return (
    <TouchableOpacity
      style={[styles.item, item.is_read && styles.itemRead]}
      onPress={() => !item.is_read && onRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { borderColor: icon.color + '44' }]}>
        <Ionicons name={icon.name} size={18} color={icon.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, item.is_read && styles.titleRead]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.message ? (
          <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        ) : null}
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const fetchNotifs = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=40');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const handleRead = async (id) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifications(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const handleReadAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#48BEFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Notifications
            {unreadCount > 0 && (
              <Text style={styles.headerBadge}> {unreadCount}</Text>
            )}
          </Text>
          <Text style={styles.headerSub}>{unreadCount} unread</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.readAllBtn} onPress={handleReadAll}>
            <Ionicons name="checkmark-done" size={14} color="#48BEFF" />
            <Text style={styles.readAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <NotifItem item={item} onRead={handleRead} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifs(); }}
            tintColor="#48BEFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={40} color="#5a9090" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 && { flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0d2e29' },
  centered:    { flex: 1, backgroundColor: '#0d2e29', justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#14453D', borderBottomWidth: 1, borderBottomColor: 'rgba(61,250,255,0.12)',
  },
  headerTitle:  { fontSize: 22, fontWeight: '900', color: '#e8f9ff' },
  headerBadge:  { color: '#ef4444' },
  headerSub:    { fontSize: 13, color: '#5a9090', marginTop: 2 },
  readAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    padding: 8, paddingHorizontal: 12, borderRadius: 8,
    backgroundColor: 'rgba(72,190,255,0.1)', borderWidth: 1, borderColor: 'rgba(72,190,255,0.25)',
  },
  readAllText: { fontSize: 12, fontWeight: '700', color: '#48BEFF' },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(61,250,255,0.06)',
    backgroundColor: 'transparent', position: 'relative',
  },
  itemRead: { opacity: 0.6 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    backgroundColor: 'rgba(72,190,255,0.08)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2,
  },
  content:    { flex: 1 },
  title:      { fontSize: 14, fontWeight: '700', color: '#e8f9ff', marginBottom: 2 },
  titleRead:  { fontWeight: '500' },
  message:    { fontSize: 13, color: '#9dd4d4', lineHeight: 18, marginBottom: 4 },
  time:       { fontSize: 11, color: '#5a9090' },
  dot: {
    position: 'absolute', top: 20, right: 16,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444',
  },

  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#e8f9ff', marginTop: 16 },
  emptyText:  { fontSize: 14, color: '#5a9090', marginTop: 4 },
});
