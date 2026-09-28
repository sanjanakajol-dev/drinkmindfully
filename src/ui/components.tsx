import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
  type StyleProp,
  type TextProps as NativeTextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, MAX_CONTENT_WIDTH, radius, spacing, type } from './theme';

type TextProps = NativeTextProps & { variant?: keyof typeof type; muted?: boolean };

export function Text({ variant = 'body', muted, style, ...rest }: TextProps) {
  return (
    <NativeText
      style={[type[variant], { color: muted ? colors.textMuted : colors.text }, style]}
      {...rest}
    />
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary';
  disabled?: boolean;
};

export function Button({ label, onPress, kind = 'primary', disabled }: ButtonProps) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}>
      <Text variant="label" style={{ color: primary ? colors.onAccent : colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  button: {
    minHeight: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  dimmed: { opacity: 0.6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
