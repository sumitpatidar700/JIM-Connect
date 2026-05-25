import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '@/src/theme/tokens';
import { useThemeColors } from '@/src/utils/settings-effects';

type FeedbackTone = 'default' | 'error' | 'success' | 'warning';

type AlertOptions = {
  confirmLabel?: string;
  message: string;
  title: string;
  tone?: FeedbackTone;
};

type ConfirmOptions = AlertOptions & {
  cancelLabel?: string;
};

type DialogState =
  | ({
      kind: 'alert';
    } & Required<AlertOptions>)
  | ({
      cancelLabel: string;
      kind: 'confirm';
    } & Required<ConfirmOptions>)
  | null;

type FeedbackContextValue = {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toneStyles: Record<Exclude<FeedbackTone, 'default'>, { accent: string; badge: string; label: string }> = {
  error: { accent: '#B42318', badge: '#FEE4E2', label: 'Error' },
  success: { accent: '#067647', badge: '#D1FADF', label: 'Success' },
  warning: { accent: '#B54708', badge: '#FEF0C7', label: 'Heads Up' },
};

export function AppFeedbackProvider({ children }: PropsWithChildren) {
  const themeColors = useThemeColors();
  const [dialog, setDialog] = useState<DialogState>(null);
  const resolverRef = useRef<((value?: boolean) => void) | null>(null);

  const closeDialog = useCallback((result?: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolver?.(result);
  }, []);

  const showAlert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setDialog({
        confirmLabel: options.confirmLabel ?? 'Okay',
        kind: 'alert',
        message: options.message,
        title: options.title,
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = (value) => resolve(Boolean(value));
      setDialog({
        cancelLabel: options.cancelLabel ?? 'Cancel',
        confirmLabel: options.confirmLabel ?? 'Confirm',
        kind: 'confirm',
        message: options.message,
        title: options.title,
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  const value = useMemo(
    () => ({
      showAlert,
      showConfirm,
    }),
    [showAlert, showConfirm]
  );

  const defaultTone = useMemo(
    () => ({
      accent: themeColors.primary,
      badge: themeColors.primarySoft,
      label: 'Notice',
    }),
    [themeColors.primary, themeColors.primarySoft],
  );
  const tone =
    dialog && dialog.tone !== 'default'
      ? toneStyles[dialog.tone]
      : defaultTone;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Modal animationType="fade" onRequestClose={() => closeDialog(false)} transparent visible={Boolean(dialog)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => (dialog?.kind === 'alert' ? closeDialog() : closeDialog(false))} />
          {dialog ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <View style={[styles.badge, { backgroundColor: tone.badge }]}>
                <Text style={[styles.badgeText, { color: tone.accent }]}>{tone.label}</Text>
              </View>
              <Text style={[styles.title, { color: themeColors.text }]}>
                {dialog.title}
              </Text>
              <Text style={[styles.message, { color: themeColors.muted }]}>
                {dialog.message}
              </Text>
              <View style={styles.actions}>
                {dialog.kind === 'confirm' ? (
                  <Pressable
                    style={[
                      styles.button,
                      styles.secondaryButton,
                      {
                        backgroundColor: themeColors.surfaceAlt,
                        borderColor: themeColors.border,
                      },
                    ]}
                    onPress={() => closeDialog(false)}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: themeColors.text },
                      ]}
                    >
                      {dialog.cancelLabel}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.button, { backgroundColor: tone.accent }]}
                  onPress={() => closeDialog(dialog.kind === 'confirm' ? true : undefined)}>
                  <Text style={styles.primaryButtonText}>{dialog.confirmLabel}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useAppFeedback must be used within AppFeedbackProvider.');
  }

  return context;
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.round,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.lg,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 108,
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    maxWidth: 420,
    padding: spacing.lg,
    width: '88%',
    ...shadows.card,
  },
  message: {
    color: colors.muted,
    fontFamily: typography.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(24, 20, 17, 0.35)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: typography.semiBold,
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: colors.text,
    fontFamily: typography.semiBold,
    fontSize: 15,
  },
  title: {
    color: colors.text,
    fontFamily: typography.bold,
    fontSize: 22,
    marginBottom: spacing.sm,
  },
});
