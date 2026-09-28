import { en } from '@/strings/en';
import { colors } from '@/ui/theme';

import { CARD_LAYOUT, EXPORT_SIZE, type ShareFormat, type ShareStat } from './ShareCard';
import { type ShareRequest } from './share-image';

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Draws the card straight onto a canvas at export size. Screenshotting the DOM is unreliable for
 * off-screen elements, and drawing keeps the text sharp.
 */
export function drawShareCard(format: ShareFormat, stats: ShareStat[]): HTMLCanvasElement {
  const { width, height } = EXPORT_SIZE[format];
  const u = width / 360;
  const L = CARD_LAYOUT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, height);
  const border = Math.max(1, L.border * u);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = border;
  ctx.strokeRect(border / 2, border / 2, width - border, height - border);

  const left = L.padding * u;
  ctx.textBaseline = 'top';

  ctx.fillStyle = colors.accent;
  ctx.font = `500 ${L.brandSize * u}px ${FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${L.brandTracking * u}px`;
  ctx.fillText(en.share.brand, left, L.padding * u);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

  const statHeight = (L.valueLine + L.labelLine) * u;
  const blockHeight = stats.length * statHeight + Math.max(0, stats.length - 1) * L.statGap * u;
  let y = (height - blockHeight) / 2;
  for (const stat of stats) {
    ctx.fillStyle = colors.text;
    ctx.font = `600 ${L.valueSize * u}px ${FONT}`;
    ctx.fillText(stat.value, left, y + ((L.valueLine - L.valueSize) / 2) * u);
    ctx.fillStyle = colors.textMuted;
    ctx.font = `400 ${L.labelSize * u}px ${FONT}`;
    ctx.fillText(stat.label, left, y + (L.valueLine + (L.labelLine - L.labelSize) / 2) * u);
    y += statHeight + L.statGap * u;
  }

  ctx.fillStyle = colors.textMuted;
  ctx.font = `400 ${L.taglineSize * u}px ${FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(en.share.tagline, left, height - L.padding * u);

  return canvas;
}

/**
 * Uses the browser's share sheet when it can share files (Safari on iPhone, Chrome on Android) and
 * falls back to downloading the image.
 */
export async function shareCardImage({ format, stats }: ShareRequest) {
  const canvas = drawShareCard(format, stats);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not create image'))),
      'image/png',
    ),
  );
  const file = new File([blob], `drink-mindfully-${format}.png`, { type: 'image/png' });

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const needsCaptureView = false;
