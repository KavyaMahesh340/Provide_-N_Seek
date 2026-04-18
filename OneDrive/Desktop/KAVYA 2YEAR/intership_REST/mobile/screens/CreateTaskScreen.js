import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { colors, globalStyles } from '../styles/theme';
import api from '../services/api';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const SelectRow = ({ options, value, onChange, color }) => (
  <View style={styles.selectRow}>
    {options.map(opt => (
      <TouchableOpacity
        key={opt}
        style={[styles.selectBtn, value === opt && { borderColor: color || colors.accent, backgroundColor: `${color || colors.accent}20` }]}
        onPress={() => onChange(opt)}
      >
        <Text style={[styles.selectBtnText, value === opt && { color: color || colors.accentLight, fontWeight: '700' }]}>
          {opt.replace('_', ' ')}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const CreateTaskScreen = ({ navigation, route }) => {
  const { task, onCreated } = route.params || {};
  const editing = !!task;

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Validation', 'Title is required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/tasks/${task.id}`, form);
      } else {
        await api.post('/tasks', form);
      }
      onCreated?.();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={globalStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editing ? 'Edit Task' : 'New Task'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={globalStyles.input}
          placeholder="Task title..."
          placeholderTextColor={colors.textMuted}
          value={form.title}
          onChangeText={v => setForm(f => ({ ...f, title: v }))}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[globalStyles.input, { height: 90, textAlignVertical: 'top', paddingTop: 12 }]}
          placeholder="Optional description..."
          placeholderTextColor={colors.textMuted}
          value={form.description}
          onChangeText={v => setForm(f => ({ ...f, description: v }))}
          multiline
        />

        <Text style={styles.label}>Status</Text>
        <SelectRow options={STATUSES} value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} />

        <Text style={[styles.label, { marginTop: 16 }]}>Priority</Text>
        <SelectRow options={PRIORITIES} value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} color={colors.warning} />

        <Text style={[styles.label, { marginTop: 16 }]}>Due Date (YYYY-MM-DD)</Text>
        <TextInput
          style={globalStyles.input}
          placeholder="2024-12-31"
          placeholderTextColor={colors.textMuted}
          value={form.due_date}
          onChangeText={v => setForm(f => ({ ...f, due_date: v }))}
        />

        <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 10 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.btnPrimaryText}>{editing ? 'Save Changes' : 'Create Task'}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { color: colors.accentLight, fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, letterSpacing: 0.3 },
  selectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  selectBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 99, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  selectBtnText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
});

export default CreateTaskScreen;
