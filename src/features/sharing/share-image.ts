import * as Sharing from 'expo-sharing';
import { type RefObject } from 'react';
import { type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { EXPORT_SIZE, type ShareFormat, type ShareStat } from './ShareCard';

export type ShareRequest = {
  /** The full-size card rendered off screen (phones only). */
  view: RefObject<View | null>;
  format: ShareFormat;
  stats: ShareStat[];
};

/** Captures the card as a PNG and opens the phone's share sheet (Instagram, WhatsApp, …). */
export async function shareCardImage({ view, format }: ShareRequest) {
  if (!view.current) throw new Error('Share card is not on screen');
  const uri = await captureRef(view, { format: 'png', result: 'tmpfile', ...EXPORT_SIZE[format] });
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle: 'Share your progress',
  });
}

/** Phones capture a rendered card; only the web draws its own image. */
export const needsCaptureView = true;
