import { useRef, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { journal, syncNow, useJournal, useSyncState } from '@/data/app-data';
import { deviceTimeZone, logicalDate } from '@/domain/dates';
import { summarizeDays } from '@/domain/days';
import { alcoholFreeDayStreak, totalAlcoholFreeDays } from '@/domain/streaks';
import { EXPORT_SIZE, ShareCard, type ShareFormat } from '@/features/sharing/ShareCard';
import { needsCaptureView, shareCardImage } from '@/features/sharing/share-image';
import { en } from '@/strings/en';
import { Button, Card, Screen, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

const t = en.preview;

/**
 * Week 1 preview: proves logging, offline sync and share images on real devices. Onboarding and
 * the real home screen replace it in week 2.
 */
export default function PreviewScreen() {
  const { loaded: ready, marks, drinks } = useJournal();
  const sync = useSyncState();
  const [format, setFormat] = useState<ShareFormat>('story');
  const [shareError, setShareError] = useState(false);
  const captureRef = useRef<View>(null);

  const today = logicalDate(new Date(), deviceTimeZone());
  const days = summarizeDays(marks, drinks);
  const todayMark = marks.find((m) => m.date === today)?.mark;
  const status = days.get(today).status;
  const streak = alcoholFreeDayStreak(days, today);
  const total = totalAlcoholFreeDays(days);

  const stats = [
    { label: t.streak, value: String(streak) },
    { label: t.total, value: String(total) },
  ];

  async function share() {
    setShareError(false);
    try {
      await shareCardImage({ view: captureRef, format, stats });
    } catch {
      setShareError(true);
    }
  }

  const statusText =
    status === 'alcohol_free'
      ? t.statusAlcoholFree
      : status === 'drank'
        ? t.statusDrank
        : t.statusUnlogged;

  const syncText =
    sync.backend === 'not_configured'
      ? t.syncNotConfigured
      : sync.backend === 'offline'
        ? t.syncOffline
        : t.syncConnected(sync.isAnonymous ?? true);

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">{en.appName}</Text>
        <Text variant="caption" muted>
          {t.badge}
        </Text>
      </View>

      <Card>
        <Text variant="label" muted>
          {t.today} · {today}
        </Text>
        <Text variant="title">{statusText}</Text>
        <View style={styles.actions}>
          <Button
            label={t.alcoholFreeToday}
            disabled={!ready}
            onPress={() => journal.setMark(today, 'alcohol_free')}
          />
          <Button
            label={t.iDrank}
            kind="secondary"
            disabled={!ready}
            onPress={() => journal.setMark(today, 'drank')}
          />
          {todayMark && (
            <Button label={t.clear} kind="secondary" onPress={() => journal.setMark(today, null)} />
          )}
        </View>
      </Card>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat}>
            <Text variant="display">{s.value}</Text>
            <Text variant="caption" muted>
              {s.label}
            </Text>
          </Card>
        ))}
      </View>

      <Card>
        <Text variant="label">{t.syncTitle}</Text>
        <Text muted>{syncText}</Text>
        {sync.userId && (
          <Text variant="caption" muted>
            {sync.userId.slice(0, 8)}…
          </Text>
        )}
        {sync.pending > 0 && (
          <Text variant="caption" muted onPress={() => void syncNow()}>
            {t.pending(sync.pending)}
          </Text>
        )}
      </Card>

      <Card>
        <Text variant="label">{t.shareTitle}</Text>
        <View style={styles.actions}>
          <Button
            label={t.story}
            kind={format === 'story' ? 'primary' : 'secondary'}
            onPress={() => setFormat('story')}
          />
          <Button
            label={t.square}
            kind={format === 'square' ? 'primary' : 'secondary'}
            onPress={() => setFormat('square')}
          />
        </View>
        <View style={styles.preview}>
          <ShareCard format={format} stats={stats} width={format === 'story' ? 200 : 280} />
        </View>
        <Button label={t.share} onPress={share} />
        {shareError && <Text muted>{t.shareFailed}</Text>}
      </Card>

      {/* Phones capture a full-resolution copy kept off screen; the web draws its own image. */}
      {needsCaptureView && (
        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard
            ref={captureRef}
            format={format}
            stats={stats}
            width={EXPORT_SIZE[format].width / PixelRatio.get()}
            exported
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.lg },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
  preview: { alignItems: 'center', paddingVertical: spacing.md },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
