import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { en } from '@/strings/en';
import { Text } from '@/ui/components';
import { colors } from '@/ui/theme';

export type ShareFormat = 'story' | 'square';

export type ShareStat = { label: string; value: string };

/** Pixel size of the exported image: 9:16 for Stories, 1:1 for WhatsApp and feeds. */
export const EXPORT_SIZE: Record<ShareFormat, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
};

/**
 * Card layout in units of 1/360 of the card width. The on-screen card and the web image renderer
 * both read these, so they always match.
 */
export const CARD_LAYOUT = {
  padding: 24,
  radius: 24,
  border: 1,
  brandSize: 12,
  brandTracking: 3,
  valueSize: 56,
  valueLine: 60,
  labelSize: 16,
  labelLine: 22,
  statGap: 24,
  taglineSize: 13,
} as const;

type Props = {
  format: ShareFormat;
  stats: ShareStat[];
  width: number;
  /** Square corners for the exported image; the on-screen preview is rounded. */
  exported?: boolean;
};

/** The card people post. Everything scales from the card width, so it looks right at any size. */
export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { format, stats, width, exported },
  ref,
) {
  const { width: w, height: h } = EXPORT_SIZE[format];
  const u = width / 360;
  const L = CARD_LAYOUT;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        styles.card,
        {
          width,
          height: (width * h) / w,
          padding: L.padding * u,
          borderRadius: exported ? 0 : L.radius * u,
          borderWidth: Math.max(1, L.border * u),
        },
      ]}>
      <Text
        style={{
          color: colors.accent,
          fontSize: L.brandSize * u,
          letterSpacing: L.brandTracking * u,
        }}>
        {en.share.brand}
      </Text>
      <View style={[styles.stats, { gap: L.statGap * u }]}>
        {stats.map((stat) => (
          <View key={stat.label}>
            <Text
              style={{ fontSize: L.valueSize * u, lineHeight: L.valueLine * u, fontWeight: '600' }}>
              {stat.value}
            </Text>
            <Text muted style={{ fontSize: L.labelSize * u, lineHeight: L.labelLine * u }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <Text muted style={{ fontSize: L.taglineSize * u }}>
        {en.share.tagline}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  stats: { flex: 1, justifyContent: 'center' },
});
