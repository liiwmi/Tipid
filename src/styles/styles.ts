// src/styles/styles.ts
import { StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from './theme';

export const globalStyles = StyleSheet.create({
  // --- AUTH STYLES ---
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  keyboardView: { 
    flex: 1, 
    justifyContent: 'center', 
    paddingHorizontal: spacing.xl 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: spacing.xxl 
  },
  title: { 
    fontSize: 48, 
    fontWeight: 'bold', 
    color: colors.text, 
    marginBottom: spacing.sm,
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 16, 
    color: colors.textSecondary,
    textAlign: 'center' 
  },
  formContainer: { 
   width: '100%',
   paddingVertical: 10,
  },
  input: { 
    backgroundColor: '#f9f9f9', 
    padding: spacing.md, 
    borderRadius: borderRadius.md, 
    marginBottom: spacing.md, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: colors.border,
    color: colors.text
  },
  button: { 
    padding: spacing.md, 
    borderRadius: borderRadius.md, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 56
  },
  primaryButton: { 
    backgroundColor: colors.primary 
  },
  secondaryButton: { 
    backgroundColor: colors.transparent, 
    borderWidth: 2, 
    borderColor: colors.primary, 
    marginTop: spacing.md 
  },
  disabledButton: {
    opacity: 0.6
  },
  buttonText: { 
    color: colors.surface, 
    fontSize: 16, 
    fontWeight: '700' 
  },
  secondaryButtonText: { 
    color: colors.primary, 
    fontSize: 16, 
    fontWeight: '700' 
  },

  // --- DASHBOARD STYLES ---
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardValue: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },

  // --- SUMMARY CARD STYLES ---
  summaryCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.surface,
    fontSize: 40,
    fontWeight: 'bold',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    padding: spacing.md,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputErrorBorder: {
    borderColor: colors.error,
  },
  passwordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: -8,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
});