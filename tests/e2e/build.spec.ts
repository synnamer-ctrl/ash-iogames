import { expect, test } from '@playwright/test';
import { byId, drag, enterWorld, find, objects, openHome, tap, toScreen } from './helpers';

test.beforeEach(async ({ page }) => {
  await openHome(page);
  await enterWorld(page, 'build');
});

test('the chute drops a ball that really falls and rolls', async ({ page }) => {
  const before = (await objects(page)).filter((o) => o.type === 'ball_red').length;
  const chute = await find(page, 'chute');
  await tap(page, chute);
  const balls = (await objects(page)).filter((o) => o.type === 'ball_red');
  expect(balls.length).toBe(before + 1);
  const ball = balls[balls.length - 1]!;
  // software-rendered CI browsers are slow, so poll rather than sleep a fixed time
  await expect.poll(async () => (await byId(page, ball.id))!.y, { timeout: 15000 }).toBeGreaterThan(ball.y + 100);
});

test('blocks can be picked up, dropped and they bounce when tapped', async ({ page }) => {
  const block = await find(page, 'block_yellow');
  await drag(page, { x: block.sx, y: block.sy }, await toScreen(page, 530, 300));
  // it falls to the floor under gravity
  await expect.poll(async () => (await byId(page, block.id))!.y, { timeout: 15000 }).toBeGreaterThan(800);
  await page.waitForTimeout(800);
  const after = (await byId(page, block.id))!;
  expect(after.x).toBeLessThan(block.x - 200);
  await tap(page, after);
  await expect.poll(async () => (await byId(page, block.id))!.y, { timeout: 5000 }).toBeLessThan(after.y - 5);
});

test('physics bodies go to sleep so the simulation idles', async ({ page }) => {
  const awake = () => page.evaluate(() => {
    const scene = window.__LWW__!.host.game.scene.getScene('BuildScene') as unknown as { matter: { world: { getAllBodies(): { isStatic: boolean; isSleeping: boolean }[] } } };
    return scene.matter.world.getAllBodies().filter((b) => !b.isStatic && !b.isSleeping).length;
  });
  await expect.poll(awake, { timeout: 30000, intervals: [1000] }).toBeLessThanOrEqual(2);
});
