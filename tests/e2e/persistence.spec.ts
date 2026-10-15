import { expect, test } from '@playwright/test';
import { byId, drag, enterWorld, find, openHome } from './helpers';

test('save, reopen, rename and delete creations; autosave survives a refresh', async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'town');
  const cat = await find(page, 'cat');
  await drag(page, { x: cat.sx, y: cat.sy }, { x: cat.sx - 150, y: cat.sy });
  const savedX = (await byId(page, cat.id))!.x;

  // save a creation
  await page.getByRole('button', { name: 'My creations' }).click();
  await page.getByRole('button', { name: 'Save what I made' }).click();
  await expect(page.getByText('Saved!')).toBeVisible();
  await expect(page.locator('.creation__name')).toHaveText(['Little Town 1']);
  await page.keyboard.press('Escape');

  // change the scene, then open the creation again
  const moved = (await byId(page, cat.id))!;
  await drag(page, { x: moved.sx, y: moved.sy }, { x: moved.sx + 300, y: moved.sy });
  expect((await byId(page, cat.id))!.x).toBeGreaterThan(savedX + 100);
  await page.getByRole('button', { name: 'My creations' }).click();
  await page.getByRole('button', { name: 'Open Little Town 1' }).click();
  await page.waitForTimeout(300);
  expect((await byId(page, cat.id))!.x).toBeCloseTo(savedX, 0);

  // autosave: refresh the page and come back
  await page.waitForTimeout(1500);
  await page.reload();
  await openHome(page);
  await enterWorld(page, 'town');
  expect((await byId(page, cat.id))!.x).toBeCloseTo(savedX, 0);

  // rename
  await page.getByRole('button', { name: 'My creations' }).click();
  await page.getByRole('button', { name: 'Rename Little Town 1' }).click();
  await page.getByRole('textbox', { name: 'New name' }).fill('Sunny Street');
  await page.keyboard.press('Enter');
  await expect(page.locator('.creation__name')).toHaveText(['Sunny Street']);

  // delete asks first
  await page.getByRole('button', { name: 'Delete Sunny Street' }).click();
  await expect(page.getByRole('dialog', { name: 'Delete “Sunny Street”?' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.locator('.creation__name')).toHaveText(['Sunny Street']);
  await page.getByRole('button', { name: 'Delete Sunny Street' }).click();
  await page.getByRole('dialog', { name: 'Delete “Sunny Street”?' }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.creation__name')).toHaveCount(0);
});

test('workshop drawings persist across refresh', async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'workshop');
  const a = await page.evaluate(() => window.__LWW__!.host.worldToScreen(500, 300));
  await drag(page, a, { x: a.x + 200, y: a.y + 100 });
  await page.waitForTimeout(1500);
  await page.reload();
  await openHome(page);
  await enterWorld(page, 'workshop');
  const n = await page.evaluate(() => window.__LWW__!.host.snapshot()!.world.strokes?.length ?? 0);
  expect(n).toBe(1);
});

test('resizing the window keeps every object where it was', async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'garden');
  const before = await page.evaluate(() => window.__LWW__!.host.debugObjects().map((o) => [o.id, Math.round(o.x), Math.round(o.y)]));
  await page.setViewportSize({ width: 420, height: 860 });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1000, height: 560 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__LWW__!.host.debugObjects().map((o) => [o.id, Math.round(o.x), Math.round(o.y)]));
  const moving = new Set(await page.evaluate(() => window.__LWW__!.host.debugObjects().filter((o) => ['bee', 'snail', 'duck'].includes(o.type)).map((o) => o.id)));
  expect(after.filter((o) => !moving.has(o[0] as string))).toEqual(before.filter((o) => !moving.has(o[0] as string)));
  // nothing overflows the small screen
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
