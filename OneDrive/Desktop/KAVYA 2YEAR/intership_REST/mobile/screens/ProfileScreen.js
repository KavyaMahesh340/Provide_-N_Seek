import React, { useState, useContext } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const Row = ({ icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, danger }) => (
  <TouchableOpacity
    style={[styles.row, danger && styles.rowDanger]}
    onPress={onPress}
    activeOpacity={isSwitch ? 1 : 0.7}
    disabled={isSwitch}
  >
    <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
      <Ionicons name={icon} size={18} color={danger ? '#ef4444' : '#48BEFF'} />
    </View>
    <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
    {isSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#3D7068', true: '#48BEFF' }}
        thumbColor={switchValue ? '#001a20' : '#9dd4d4'}
      />
    ) : value ? (
      <Text style={styles.rowValue}>{value}</Text>
    ) : (
      <Ionicons name="chevron-forward" size={16} color="#5a9090" />
    )}
  </TouchableOpacity>
);

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [notifPrefs, setNotifPrefs] = useState(user?.notif_prefs || {
    task_assigned: true, task_mentioned: true, task_due_soon: true, digest: false,
  });
  const [saving, setSaving] = useState(false);

  const togglePref = async (key) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    setSaving(true);
    try {
      await api.patch('/users/me', { notif_prefs: updated });
    } catch {}
    setSaving(false);
  };

  const handleExportData = async () => {
    Alert.alert(
      'Export My Data',
      'This will download all your personal data as a JSON file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              await api.get('/users/me/export');
              Alert.alert('Success', 'Data ready. Check your browser to download.');
            } catch {
              Alert.alert('Error', 'Export failed. Please try in the web app.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Avatar header */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.badge, user?.role === 'admin' && styles.badgeAdmin]}>
          <Text style={[styles.badgeText, user?.role === 'admin' && styles.badgeTextAdmin]}>
            {user?.role}
          </Text>
        </View>
        {user?.organization && (
          <Text style={styles.orgName}>{user.organization.name}</Text>
        )}
      </View>

      {/* Account info */}
      <Section title="ACCOUNT">
        <Row icon="person-outline"  label="Name"   value={user?.name} />
        <Row icon="mail-outline"    label="Email"  value={user?.email} />
        <Row icon="shield-outline"  label="Role"   value={user?.role} />
        <Row
          icon="finger-print-outline"
          label="Two-Factor Auth"
          value={user?.totp_enabled ? '✅ Enabled' : '❌ Off'}
          onPress={() => Alert.alert('2FA', 'Manage 2FA from the web app Settings page.')}
        />
      </Section>

      {/* Notification preferences */}
      <Section title="NOTIFICATIONS">
        {[
          { key: 'task_assigned',  label: 'Task assigned to me' },
          { key: 'task_mentioned', label: '@Mentions' },
          { key: 'task_due_soon',  label: 'Due date reminders' },
          { key: 'digest',         label: 'Daily digest email' },
        ].map(p => (
          <Row
            key={p.key}
            icon="notifications-outline"
            label={p.label}
            isSwitch
            switchValue={!!notifPrefs[p.key]}
            onSwitchChange={() => togglePref(p.key)}
          />
        ))}
        {saving && (
          <View style={{ alignItems: 'center', padding: 8 }}>
            <ActivityIndicator size="small" color="#48BEFF" />
          </View>
        )}
      </Section>

      {/* Privacy */}
      <Section title="PRIVACY & DATA">
        <Row
          icon="download-outline"
          label="Export My Data (GDPR)"
          onPress={handleExportData}
        />
      </Section>

      {/* Danger zone */}
      <Section title="SESSION">
        <Row
          icon="log-out-outline"
          label="Logout"
          onPress={handleLogout}
          danger
        />
      </Section>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d2e29' },

  avatarSection: {
    alignItems: 'center',
    paddingTop: 60, paddingBottom: 28,
    backgroundColor: '#14453D',
    borderBottomWidth: 1, borderBottomColor: 'rgba(61,250,255,0.12)',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#48BEFF',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#48BEFF', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 10,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#001a20' },
  name:       { fontSize: 22, fontWeight: '900', color: '#e8f9ff', marginBottom: 4 },
  email:      { fontSize: 13, color: '#9dd4d4', marginBottom: 10 },
  badge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    backgroundColor: 'rgba(67,197,158,0.15)',
    borderWidth: 1, borderColor: 'rgba(67,197,158,0.3)',
    marginBottom: 6,
  },
  badgeAdmin: {
    backgroundColor: 'rgba(72,190,255,0.15)',
    borderColor: 'rgba(72,190,255,0.35)',
  },
  badgeText:      { fontSize: 12, fontWeight: '700', color: '#43C59E', textTransform: 'capitalize' },
  badgeTextAdmin: { color: '#48BEFF' },
  orgName: { fontSize: 12, color: '#5a9090', marginTop: 4 },

  section:      { marginTop: 24, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: '#5a9090', letterSpacing: 1.4, marginBottom: 8, marginLeft: 4 },
  sectionCard: {
    borderRadius: 14, backgroundColor: '#14453D',
    borderWidth: 1, borderColor: 'rgba(61,250,255,0.1)', overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(61,250,255,0.06)',
  },
  rowDanger:      { backgroundColor: 'rgba(239,68,68,0.06)' },
  rowIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(72,190,255,0.1)',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  rowIconDanger:  { backgroundColor: 'rgba(239,68,68,0.1)' },
  rowLabel:       { flex: 1, fontSize: 14, color: '#e8f9ff', fontWeight: '600' },
  rowLabelDanger: { color: '#ef4444' },
  rowValue:       { fontSize: 13, color: '#5a9090', fontWeight: '500' },
});
