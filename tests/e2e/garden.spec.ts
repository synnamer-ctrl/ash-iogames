import { expect, test } from '@playwright/test';
import { byId, discovered, drag, enterWorld, objects, openHome, tap } from './helpers';

test.beforeEach(async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'garden');
});

test('plant a seed, water it, and watch it grow', async ({ page }) => {
  const soils = (await objects(page)).filter((o) => o.type === 'soil' && o.state.stage === 0);
  const soil = soils[0]!;
  const packet = (await objects(page)).find((o) => o.type === 'packet_daisy')!;
  await drag(page, { x: packet.sx, y: packet.sy }, { x: soil.sx, y: soil.sy - 10 });
  let s = (await byId(page, soil.id))!;
  expect(s.state.stage).toBe(1);
  expect(s.state.species).toBe('daisy');
  const can = (await objects(page)).find((o) => o.type === 'watering_can')!;
  // hover the can over the seedling for a moment
  await drag(page, { x: can.sx, y: can.sy }, { x: soil.sx - 10, y: soil.sy - 40 }, { hold: 1100 });
  s = (await byId(page, soil.id))!;
  expect(s.state.stage as number).toBeGreaterThanOrEqual(2);
  expect(await discovered(page)).toEqual(expect.arrayContaining(['garden.plant', 'garden.water']));
});

test('rain from a cloud grows plants, then the sun makes a rainbow', async ({ page }) => {
  const all = await objects(page);
  const sprout = all.find((o) => o.type === 'soil' && o.state.stage === 2)!;
  const cloud = all.find((o) => o.type === 'cloud_a')!;
  // move the cloud over the sprout and tap it
  await drag(page, { x: cloud.sx, y: cloud.sy }, { x: sprout.sx, y: cloud.sy });
  const moved = (await byId(page, cloud.id))!;
  await tap(page, moved);
  await page.waitForTimeout(3200);
  expect((await byId(page, sprout.id))!.state.stage).toBe(3);
  const sun = (await objects(page)).find((o) => o.type === 'sun')!;
  await tap(page, sun);
  expect(await discovered(page)).toEqual(expect.arrayContaining(['garden.rain', 'garden.rainbow']));
});

test('objects splash into the pond and a bird perches in a tree', async ({ page }) => {
  const all = await objects(page);
  const pebble = all.find((o) => o.type === 'pebble')!;
  const pond = await page.evaluate(() => window.__LWW__!.host.worldToScreen(1180, 790));
  await drag(page, { x: pebble.sx, y: pebble.sy }, pond);
  expect(await discovered(page)).toContain('garden.splash');
  await page.waitForTimeout(1200);
  expect(await byId(page, pebble.id)).toBeDefined();
  const bird = all.find((o) => o.type === 'bird')!;
  const tree = all.find((o) => o.type === 'tree_round')!;
  await drag(page, { x: bird.sx, y: bird.sy }, { x: tree.sx, y: tree.sy - 40 });
  expect(await discovered(page)).toContain('garden.perch');
});
