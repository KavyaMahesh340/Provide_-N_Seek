import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, globalStyles, badgeStyle } from '../styles/theme';
import api from '../services/api';

const StatCard = ({ label, value, color, emoji }) => (
  <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 2 }]}>
    <Text style={{ fontSize: 22 }}>{emoji}</Text>
    <Text style={[globalStyles.heading, { fontSize: 28, marginVertical: 2 }]}>{value}</Text>
    <Text style={globalStyles.caption}>{label}</Text>
  </View>
);

const HomeScreen = ({ navigation }) => {
  const { user, isAdmin, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, done: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/tasks?limit=100');
      const all = data.tasks || [];
      setTasks(all.slice(0, 4));
      setStats({
        total: data.total || all.length,
        in_progress: all.filter(t => t.status === 'in_progress').length,
        done: all.filter(t => t.status === 'done').length,
        urgent: all.filter(t => t.priority === 'urgent').length,
      });
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U';

  return (
    <View style={globalStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.accentLight} />}
      >
        {/* Header */}
        <View style={[globalStyles.spaceBetween, { marginBottom: 24 }]}>
          <View>
            <Text style={[globalStyles.heading, { fontSize: 20 }]}>{greeting()},</Text>
            <Text style={[globalStyles.heading, { color: colors.accentLight }]}>{user?.name?.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity style={globalStyles.avatar} onPress={() => {}} >
            <Text style={globalStyles.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Total Tasks" value={stats.total} color={colors.accent} emoji="📋" />
          <StatCard label="In Progress" value={stats.in_progress} color={colors.warning} emoji="⏳" />
          <StatCard label="Completed" value={stats.done} color={colors.success} emoji="✅" />
          <StatCard label="Urgent" value={stats.urgent} color={colors.danger} emoji="🔥" />
        </View>

        {/* Progress */}
        <View style={globalStyles.card}>
          <View style={[globalStyles.spaceBetween, { marginBottom: 10 }]}>
            <Text style={globalStyles.subheading}>Overall Progress</Text>
            <Text style={globalStyles.caption}>{stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%</Text>
          </View>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${stats.total > 0 ? (stats.done / stats.total) * 100 : 0}%` }]} />
          </View>
        </View>

        {/* Recent Tasks */}
        <Text style={globalStyles.sectionLabel}>Recent Tasks</Text>
        {loading ? (
          <ActivityIndicator color={colors.accentLight} style={{ marginTop: 20 }} />
        ) : tasks.length === 0 ? (
          <View style={[globalStyles.card, { alignItems: 'center', paddingVertical: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>📭</Text>
            <Text style={globalStyles.subheading}>No tasks yet</Text>
            <Text style={[globalStyles.caption, { marginTop: 4 }]}>Create your first task</Text>
          </View>
        ) : tasks.map(task => {
          const s = badgeStyle(task.status);
          const p = badgeStyle(task.priority);
          return (
            <TouchableOpacity key={task.id} style={globalStyles.card} onPress={() => navigation.navigate('Tasks')}>
              <Text style={[globalStyles.subheading, { fontSize: 14, marginBottom: 8 }]} numberOfLines={1}>{task.title}</Text>
              <View style={globalStyles.row}>
                <View style={[globalStyles.badge, { backgroundColor: s.bg, marginRight: 8 }]}>
                  <Text style={[globalStyles.badgeText, { color: s.color }]}>{task.status.replace('_', ' ')}</Text>
                </View>
                <View style={[globalStyles.badge, { backgroundColor: p.bg }]}>
                  <Text style={[globalStyles.badgeText, { color: p.color }]}>{task.priority}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Logout */}
        <TouchableOpacity style={[globalStyles.btnSecondary, { marginTop: 16 }]} onPress={logout}>
          <Text style={[globalStyles.btnSecondaryText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.bgCard,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  progressBg: { height: 8, backgroundColor: colors.bgSecondary, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 99 },
});

export default HomeScreen;
