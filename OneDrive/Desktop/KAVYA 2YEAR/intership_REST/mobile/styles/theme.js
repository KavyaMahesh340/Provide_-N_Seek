import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const colors = {
  bg: '#0a0b0f',
  bgCard: '#16181f',
  bgSecondary: '#111318',
  bgHover: '#1c1f28',
  accent: '#6366f1',
  accentLight: '#818cf8',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  border: 'rgba(255,255,255,0.06)',
  borderActive: 'rgba(99,102,241,0.5)',
};

export const globalStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  safeArea: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: 20, backgroundColor: colors.bg },

  // Card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },

  // Text
  heading: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5 },
  subheading: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  caption: { fontSize: 12, color: colors.textSecondary },
  muted: { fontSize: 12, color: colors.textMuted },

  // Inputs
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: 14,
  },
  inputFocused: { borderColor: colors.accent },

  // Buttons
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  btnSecondary: {
    backgroundColor: colors.bgHover,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },

  btnDanger: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  btnDangerText: { color: colors.danger, fontWeight: '600', fontSize: 13 },

  // Row
  row: { flexDirection: 'row', alignItems: 'center' },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Badge
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Avatar
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Section label
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },
});

export const badgeStyle = (type) => {
  const map = {
    todo: { bg: 'rgba(71,85,105,0.3)', color: '#94a3b8' },
    in_progress: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    review: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    done: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
    low: { bg: 'rgba(71,85,105,0.3)', color: '#94a3b8' },
    medium: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
    high: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    urgent: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
    admin: { bg: 'rgba(99,102,241,0.2)', color: '#818cf8' },
    member: { bg: 'rgba(71,85,105,0.3)', color: '#94a3b8' },
  };
  return map[type] || { bg: 'rgba(71,85,105,0.3)', color: '#94a3b8' };
};
