import { expect, test } from '@playwright/test';
import { enterWorld, openHome, watchErrors } from './helpers';

test('home screen shows four illustrated worlds without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await openHome(page);
  for (const name of ['Little Town', 'Nature Garden', 'Creative Workshop', 'Build & Play']) {
    await expect(page.getByRole('button', { name: `Play in ${name}` })).toBeVisible();
  }
  // every card image actually loaded
  const loaded = await page.$$eval('.world-card img', (imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0));
  expect(loaded).toBe(true);
  expect(errors).toEqual([]);
});

test('all four worlds open with illustrated objects and textures', async ({ page }) => {
  const errors = watchErrors(page);
  await openHome(page);
  for (const world of ['town', 'garden', 'workshop', 'build']) {
    await enterWorld(page, world);
    const info = await page.evaluate(() => {
      const objs = window.__LWW__!.host.debugObjects();
      return { count: objs.length, missing: objs.filter((o) => !o.textureOk).length };
    });
    expect(info.count, world).toBeGreaterThan(8);
    expect(info.missing, world).toBe(0);
    await page.getByRole('button', { name: 'Back to worlds' }).click();
    await expect(page.locator('.world-card')).toHaveCount(4);
  }
  expect(errors).toEqual([]);
});

test('settings: separate sound effect and music switches, calm motion', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const sfx = page.getByRole('switch', { name: 'Sound effects' });
  const music = page.getByRole('switch', { name: 'Music' });
  await expect(sfx).toHaveAttribute('aria-checked', 'true');
  await sfx.click();
  await expect(sfx).toHaveAttribute('aria-checked', 'false');
  await expect(music).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('switch', { name: 'Calm motion' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // persisted across reload
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('switch', { name: 'Sound effects' })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Calm motion' })).toHaveAttribute('aria-checked', 'true');
});

test('menus are keyboard accessible', async ({ page }) => {
  await openHome(page);
  await page.getByRole('button', { name: 'Play in Little Town' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__LWW__?.host.currentWorld() === 'town');
  await expect(page.getByRole('button', { name: 'Toy box' })).toBeVisible();
  await page.getByRole('button', { name: 'Toy box' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Toy box' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
