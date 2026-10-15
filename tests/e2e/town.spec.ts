import { expect, test } from '@playwright/test';
import { byId, discovered, drag, enterWorld, find, openHome, snapshot, tap, toScreen, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'town');
});

test('tapping objects animates them and changes their state', async ({ page }) => {
  const errors = watchErrors(page);
  const house = await find(page, 'house_a');
  await tap(page, house);
  expect((await byId(page, house.id))!.state.open).toBe(true);
  const box = await find(page, 'mailbox');
  await tap(page, box);
  expect((await byId(page, box.id))!.state.open).toBe(true);
  await tap(page, box);
  expect((await byId(page, box.id))!.state.open).toBe(false);
  const light = await find(page, 'traffic_light');
  await tap(page, light);
  expect((await byId(page, light.id))!.state.light).toBe('amber');
  await tap(page, light);
  expect((await byId(page, light.id))!.state.light).toBe('red');
  expect(errors).toEqual([]);
});

test('a tap never drags and a drag never taps', async ({ page }) => {
  const cat = await find(page, 'cat');
  await tap(page, cat);
  const after = (await byId(page, cat.id))!;
  expect(after.x).toBeCloseTo(cat.x, 0);
  // dragging the mailbox does not toggle it open
  const box = await find(page, 'mailbox');
  await drag(page, { x: box.sx, y: box.sy }, { x: box.sx - 60, y: box.sy + 10 });
  const moved = (await byId(page, box.id))!;
  expect(moved.state.open).toBe(false);
  expect(moved.x).toBeLessThan(box.x - 30);
});

test('dragging a vehicle onto the road makes it drive (and it is a discovery)', async ({ page }) => {
  const bike = await find(page, 'bike');
  const road = await toScreen(page, 700, 860);
  await drag(page, { x: bike.sx, y: bike.sy }, road);
  const b = (await byId(page, bike.id))!;
  expect(b.state.driving).toBe(true);
  await page.waitForTimeout(700);
  const later = (await byId(page, bike.id))!;
  expect(later.x).not.toBeCloseTo(b.x, 0);
  expect(await discovered(page)).toContain('town.drive');
});

test('combinations: cat naps on a bench, flowers plant in beds', async ({ page }) => {
  const cat = await find(page, 'cat');
  const bench = await find(page, 'bench');
  await drag(page, { x: cat.sx, y: cat.sy }, { x: bench.sx, y: bench.sy - 15 });
  expect((await byId(page, cat.id))!.state.sleeping).toBe(true);
  const flower = await find(page, 'flower_red');
  const bed = await find(page, 'flowerbed');
  await drag(page, { x: flower.sx, y: flower.sy }, { x: bed.sx + 10, y: bed.sy - 30 });
  expect((await byId(page, flower.id))!.state.planted).toBe(true);
  const found = await discovered(page);
  expect(found).toEqual(expect.arrayContaining(['town.nap', 'town.flower']));
});

test('the sun turns the town to night, undo turns it back', async ({ page }) => {
  const sun = await find(page, 'sun');
  await tap(page, sun);
  expect((await snapshot(page))!.world.night).toBe(true);
  expect((await find(page, 'streetlight')).state.on).toBe(true);
  await page.getByRole('button', { name: 'Undo' }).click();
  expect((await snapshot(page))!.world.night ?? false).toBe(false);
  await page.getByRole('button', { name: 'Redo' }).click();
  expect((await snapshot(page))!.world.night).toBe(true);
});

test('start over asks first and can be cancelled', async ({ page }) => {
  const cat = await find(page, 'cat');
  await drag(page, { x: cat.sx, y: cat.sy }, { x: cat.sx - 120, y: cat.sy });
  const movedX = (await byId(page, cat.id))!.x;
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  expect((await byId(page, cat.id))!.x).toBeCloseTo(movedX, 0);
  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start over' }).click();
  await page.waitForTimeout(300);
  const cats = (await page.evaluate(() => window.__LWW__!.host.debugObjects())).filter((o) => o.type === 'cat');
  expect(cats[0]!.x).toBeCloseTo(1080, 0);
});

test('the toy box adds new objects', async ({ page }) => {
  const before = (await page.evaluate(() => window.__LWW__!.host.debugObjects())).filter((o) => o.type === 'dog').length;
  await page.getByRole('button', { name: 'Toy box' }).click();
  await page.getByRole('button', { name: 'Add Biscuit the dog' }).click();
  await expect(page.getByRole('dialog', { name: 'Toy box' })).toHaveCount(0);
  const after = (await page.evaluate(() => window.__LWW__!.host.debugObjects())).filter((o) => o.type === 'dog').length;
  expect(after).toBe(before + 1);
});
