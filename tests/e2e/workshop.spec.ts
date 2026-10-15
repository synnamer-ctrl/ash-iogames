import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { discovered, drag, enterWorld, find, openHome, snapshot, tap, toScreen, touchDrag } from './helpers';

const strokes = async (page: import('@playwright/test').Page) => ((await snapshot(page))!.world.strokes ?? []).length;

test.beforeEach(async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'workshop');
});

test('draw with the mouse and with touch, undo and redo', async ({ page }) => {
  const a = await toScreen(page, 500, 300);
  const b = await toScreen(page, 900, 450);
  await drag(page, a, b, { steps: 20 });
  expect(await strokes(page)).toBe(1);
  // touch drawing (real touch events)
  const t0 = await toScreen(page, 500, 600);
  const pts = Array.from({ length: 15 }, (_, i) => ({ x: t0.x + i * 18, y: t0.y + Math.sin(i / 2) * 30 }));
  await touchDrag(page, pts);
  expect(await strokes(page)).toBe(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await strokes(page)).toBe(1);
  await page.getByRole('button', { name: 'Redo' }).click();
  expect(await strokes(page)).toBe(2);
  expect(await discovered(page)).toContain('workshop.draw');
});

test('change brush colour and size, stamp and fill the paper', async ({ page }) => {
  await page.getByRole('button', { name: 'Crayon' }).click();
  await page.getByRole('radio', { name: 'Colour #6BBAD7' }).click();
  await page.getByRole('radio', { name: 'Size 34' }).click();
  await drag(page, await toScreen(page, 600, 400), await toScreen(page, 800, 500));
  const s1 = (await snapshot(page))!.world.strokes![0]!;
  expect(s1).toMatchObject({ tool: 'crayon', color: '#6BBAD7', size: 34 });
  await page.getByRole('button', { name: 'Stamps' }).click();
  await page.getByRole('radio', { name: 'heart stamp' }).click();
  await tap(page, await toScreen(page, 1000, 300));
  expect((await snapshot(page))!.world.strokes![1]).toMatchObject({ tool: 'stamp', shape: 'heart' });
  await page.getByRole('button', { name: 'Paint bucket' }).click();
  await page.getByRole('radio', { name: 'Colour #FFD66B' }).click();
  await tap(page, await toScreen(page, 700, 700));
  expect((await snapshot(page))!.world.paperColor).toBe('#FFD66B');
});

test('stickers can be placed, rotated and resized', async ({ page }) => {
  const star = await find(page, 'sticker_star');
  const target = await toScreen(page, 700, 450);
  await drag(page, { x: star.sx, y: star.sy }, target);
  const placed = (await snapshot(page))!.objects.find((o) => o.id === star.id)!;
  expect(placed.x).toBeGreaterThan(600);
  // the resize handle sits at the sticker's lower-right corner
  const handle = await page.evaluate(() => {
    const host = window.__LWW__!.host;
    const scene = host.game.scene.getScene('WorkshopScene') as unknown as { children: { list: { getData?: (k: string) => unknown; x: number; y: number; visible: boolean }[] } };
    const h = scene.children.list.find((c) => c.getData?.('handle') === 'scale' && c.visible)!;
    return host.worldToScreen(h.x, h.y);
  });
  await drag(page, handle, { x: handle.x + 60, y: handle.y + 60 });
  const resized = (await snapshot(page))!.objects.find((o) => o.id === star.id)!;
  expect(resized.scale).toBeGreaterThan(1.2);
  expect(await discovered(page)).toEqual(expect.arrayContaining(['workshop.sticker', 'workshop.spin']));
});

test('export the artwork as a valid PNG', async ({ page }) => {
  await drag(page, await toScreen(page, 500, 300), await toScreen(page, 900, 600));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save picture' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.png$/);
  const path = await file.path();
  const bytes = readFileSync(path!);
  expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  // 2x the 1100x720 paper
  expect(bytes.readUInt32BE(16)).toBe(2200);
  expect(bytes.readUInt32BE(20)).toBe(1440);
});

test('clearing the paper asks for confirmation', async ({ page }) => {
  await drag(page, await toScreen(page, 500, 300), await toScreen(page, 900, 600));
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('dialog', { name: 'Clear the paper?' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Start over' }).click();
  expect(await strokes(page)).toBe(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await strokes(page)).toBe(1);
});
