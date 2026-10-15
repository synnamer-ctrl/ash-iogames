import { expect, test } from '@playwright/test';
import { byId, objects, openHome, touchDrag, touchTap, watchErrors } from './helpers';

test('mobile: touch menus, touch drag and no page scrolling', async ({ page }) => {
  const errors = watchErrors(page);
  await openHome(page);
  const card = page.locator('[data-world="garden"]');
  const box = (await card.boundingBox())!;
  await touchTap(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await page.waitForFunction(() => window.__LWW__?.host.currentWorld() === 'garden' && window.__LWW__.host.debugObjects().length > 0);
  await page.waitForTimeout(600);
  // every HUD control is on screen and big enough to touch
  const buttons = await page.locator('.hud .icon-btn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight })));
  expect(buttons.length).toBeGreaterThanOrEqual(8);
  for (const b of buttons) {
    expect(b.inside).toBe(true);
    expect(b.w).toBeGreaterThanOrEqual(44);
  }
  // drag something visible on screen with a finger
  const vw = page.viewportSize()!;
  const candidates = (await objects(page)).filter((o) => ['mushroom_red', 'mushroom_lav', 'rock', 'pebble', 'apple', 'carrot', 'packet_tulip', 'packet_sun', 'packet_daisy', 'watering_can', 'snail', 'hedgehog'].includes(o.type) && o.sx > 80 && o.sx < vw.width - 120 && o.sy > 160 && o.sy < vw.height - 160);
  expect(candidates.length).toBeGreaterThan(0);
  const rabbit = candidates[0]!;
  await touchDrag(page, Array.from({ length: 12 }, (_, i) => ({ x: rabbit.sx + i * 8, y: rabbit.sy + i * 3 })));
  const moved = (await byId(page, rabbit.id))!;
  expect(Math.abs(moved.x - rabbit.x)).toBeGreaterThan(20);
  expect(await page.evaluate(() => window.scrollY + document.documentElement.scrollTop)).toBe(0);
  // open and close the toy box by touch
  const toy = (await page.getByRole('button', { name: 'Toy box' }).boundingBox())!;
  await touchTap(page, { x: toy.x + toy.width / 2, y: toy.y + toy.height / 2 });
  await expect(page.getByRole('dialog', { name: 'Toy box' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Back to worlds' }).click();
  await expect(page.locator('.world-card')).toHaveCount(4);
  expect(errors).toEqual([]);
});
