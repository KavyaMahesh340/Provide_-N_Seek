import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, StatusBar, TextInput
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, globalStyles, badgeStyle } from '../styles/theme';
import api from '../services/api';

const TaskItem = ({ task, onEdit, onDelete, canEdit }) => {
  const s = badgeStyle(task.status);
  const p = badgeStyle(task.priority);
  return (
    <View style={globalStyles.card}>
      <View style={[globalStyles.spaceBetween, { marginBottom: 8 }]}>
        <Text style={[globalStyles.subheading, { fontSize: 14, flex: 1, marginRight: 8 }]} numberOfLines={2}>{task.title}</Text>
        {canEdit && (
          <View style={globalStyles.row}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(task)}>
              <Text style={{ fontSize: 13 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: 'rgba(239,68,68,0.15)' }]} onPress={() => onDelete(task.id)}>
              <Text style={{ fontSize: 13 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {task.description ? <Text style={[globalStyles.caption, { marginBottom: 8 }]} numberOfLines={2}>{task.description}</Text> : null}
      <View style={globalStyles.row}>
        <View style={[globalStyles.badge, { backgroundColor: s.bg, marginRight: 8 }]}>
          <Text style={[globalStyles.badgeText, { color: s.color }]}>{task.status.replace('_', ' ')}</Text>
        </View>
        <View style={[globalStyles.badge, { backgroundColor: p.bg }]}>
          <Text style={[globalStyles.badgeText, { color: p.color }]}>{task.priority}</Text>
        </View>
        {task.due_date && (
          <Text style={[globalStyles.muted, { marginLeft: 10 }]}>📅 {new Date(task.due_date).toLocaleDateString()}</Text>
        )}
      </View>
      {task.creator && (
        <Text style={[globalStyles.muted, { marginTop: 8 }]}>By {task.creator.name}</Text>
      )}
    </View>
  );
};

const TasksScreen = ({ navigation }) => {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.set('search', search);
      const { data } = await api.get(`/tasks?${params}`);
      setTasks(data.tasks || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDelete = (id) => {
    Alert.alert('Delete Task', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/tasks/${id}`);
            setTasks(t => t.filter(x => x.id !== id));
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Cannot delete task');
          }
        }
      }
    ]);
  };

  const canEdit = (task) => isAdmin || task.created_by === user?.id;

  return (
    <View style={globalStyles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
        <View style={[globalStyles.spaceBetween, { marginBottom: 14 }]}>
          <Text style={globalStyles.heading}>Tasks</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('CreateTask', { onCreated: fetchTasks })}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>+</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[globalStyles.input, { marginBottom: 4 }]}
          placeholder="🔍  Search tasks..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accentLight} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTasks(); }} tintColor={colors.accentLight} />}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              canEdit={canEdit(item)}
              onEdit={(t) => navigation.navigate('CreateTask', { task: t, onCreated: fetchTasks })}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
              <Text style={globalStyles.subheading}>No tasks found</Text>
              <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 16, paddingHorizontal: 24 }]}
                onPress={() => navigation.navigate('CreateTask', { onCreated: fetchTasks })}>
                <Text style={globalStyles.btnPrimaryText}>+ Create Task</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
});

export default TasksScreen;
