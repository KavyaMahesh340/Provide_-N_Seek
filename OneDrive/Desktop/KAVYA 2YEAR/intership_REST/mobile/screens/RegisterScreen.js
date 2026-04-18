import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { colors, globalStyles } from '../styles/theme';
import api from '../services/api';

const RegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password || !form.orgName) {
      Alert.alert('Error', 'Please fill all fields'); return;
    }
    if (form.password.length < 8) { Alert.alert('Error', 'Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      await login(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const field = (label, key, opts = {}) => (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={globalStyles.input}
        placeholderTextColor={colors.textMuted}
        value={form[key]}
        onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
        {...opts}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={globalStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}><Text style={{ fontSize: 24 }}>⚡</Text></View>
          <Text style={styles.logoText}>Task<Text style={{ color: colors.accentLight }}>Flow</Text></Text>
        </View>
        <Text style={styles.title}>Create workspace</Text>
        <Text style={styles.subtitle}>Manage tasks with your team</Text>

        <View style={styles.form}>
          {field('Full Name', 'name', { placeholder: 'Alice Johnson', autoCapitalize: 'words' })}
          {field('Work Email', 'email', { placeholder: 'alice@company.com', keyboardType: 'email-address', autoCapitalize: 'none' })}
          {field('Organization Name', 'orgName', { placeholder: 'Acme Corp', autoCapitalize: 'words' })}
          {field('Password', 'password', { placeholder: 'Min 8 characters', secureTextEntry: true })}

          <TouchableOpacity style={[globalStyles.btnPrimary, { marginTop: 6 }]} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={globalStyles.btnPrimaryText}>Create Workspace</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={globalStyles.caption}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[globalStyles.caption, { color: colors.accentLight, fontWeight: '700' }]}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 28 },
  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logoIcon: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  logoText: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  form: { backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, letterSpacing: 0.3 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});

export default RegisterScreen;
