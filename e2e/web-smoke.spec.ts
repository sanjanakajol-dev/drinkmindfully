import { readFileSync, writeFileSync } from 'fs';

import { expect, test } from '@playwright/test';

test('logs an alcohol-free day, keeps it after a reload, and renders the share card', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Drink Mindfully', { exact: true })).toBeVisible();
  await expect(page.getByText('Nothing logged yet.')).toBeVisible();

  await page.getByRole('button', { name: 'Alcohol-free today' }).click();
  await expect(page.getByText('Alcohol-free so far. Nice.')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Alcohol-free so far. Nice.')).toBeVisible();

  await page.getByRole('button', { name: 'Square (1:1)' }).click();
  await expect(page.getByText('DRINK MINDFULLY').first()).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/preview.png', fullPage: true });

  // Browsers without file sharing (like headless Chrome) download the image instead.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('drink-mindfully-square.png');

  const png = readFileSync(await file.path());
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1080]);
  writeFileSync('e2e/screenshots/share-square.png', png);

  await page.getByRole('button', { name: 'Story (9:16)' }).click();
  const storyDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Share', exact: true }).click();
  const story = readFileSync(await (await storyDownload).path());
  expect([story.readUInt32BE(16), story.readUInt32BE(20)]).toEqual([1080, 1920]);
  writeFileSync('e2e/screenshots/share-story.png', story);
});
