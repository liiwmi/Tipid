// src/styles/styles.ts
// Base structural styles only — no colors.
// Colors are applied dynamically via useTheme() in each component.
import { StyleSheet } from 'react-native';
import { spacing, borderRadius, fontSizes, fontWeights } from './theme';

export const globalStyles = StyleSheet.create({

  // ─────────────────────────────────────────
  // LAYOUT & CONTAINERS
  // ─────────────────────────────────────────

  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
  },
  scrollContent: {
    padding: spacing.lg,
  },

  // ─────────────────────────────────────────
  // HEADER & GREETING
  // ─────────────────────────────────────────

  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  greetingContainer: {
    marginBottom: spacing.xxl,
  },
  greetingText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extraBold,
  },
  nameText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extraBold,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────

  title: {
    fontSize: fontSizes.hero,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.base,
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorText: {
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: fontSizes.md,
  },
  sectionHeader: {
    fontSize: fontSizes.md,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },

  // ─────────────────────────────────────────
  // INPUTS & FORMS
  // ─────────────────────────────────────────

  input: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSizes.base,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  inputErrorBorder: {
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
  },
  eyeIcon: {
    padding: spacing.xs,
  },
  passwordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },

  // ─────────────────────────────────────────
  // BUTTONS
  // ─────────────────────────────────────────

  button: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  buttonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  primaryButton: {
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  linkText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
  },
  toggleText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: borderRadius.full,
    right: spacing.lg,
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#fc5d00',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // ─────────────────────────────────────────
  // CHART
  // ─────────────────────────────────────────

  chartContainer: {
  height: 150,
  justifyContent: 'flex-end',
  position: 'relative',
},
  thresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    zIndex: 0,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: spacing.sm,
    zIndex: 1,
  },
  barContainer: {
    alignItems: 'center',
    width: 30,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  barLabel: {
    fontSize: fontSizes.xs,
  },

  // ─────────────────────────────────────────
  // CARDS
  // ─────────────────────────────────────────

  quotaCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
  quotaValue: {
    fontSize: fontSizes.xxxl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.md,
  },
  quotaSub: {
    fontSize: fontSizes.lg,
  },
  progressTrack: {
    height: 8,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  quotaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quotaFooterText: {
    fontSize: fontSizes.sm,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  gridCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  gridValue: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
    marginTop: spacing.sm,
  },

  // ─────────────────────────────────────────
  // LIST
  // ─────────────────────────────────────────

  listContainer: {
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md - 3,
    borderBottomWidth: 1,
  },
  listIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  listTextWrapper: {
    flex: 1,
  },
  listTitle: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
  },
  listSub: {
    fontSize: fontSizes.sm,
    marginTop: 2,
  },

  forgotPasswordText: {
  fontSize: fontSizes.md,
  fontWeight: fontWeights.semibold,
},

pruneAlert: {
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
  marginBottom: 12,
},
});