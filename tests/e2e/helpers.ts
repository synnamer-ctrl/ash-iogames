import { expect, type Page } from '@playwright/test';

export interface DebugObject {
  id: string;
  type: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  depth: number;
  state: Record<string, unknown>;
}

/** Collect console errors and uncaught exceptions for the whole test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function openHome(page: Page): Promise<void> {
  await page.goto('/?e2e');
  await expect(page.locator('.world-card')).toHaveCount(4);
  await page.waitForFunction(() => !!window.__LWW__);
}

export async function enterWorld(page: Page, world: string): Promise<void> {
  await page.locator(`[data-world="${world}"]`).click({ force: true });
  await page.waitForFunction((w) => window.__LWW__?.host.currentWorld() === w && window.__LWW__.host.debugObjects().length > 0, world);
  await expect(page.locator('.curtain')).toHaveCount(0);
  await page.waitForTimeout(600);
}

export const objects = (page: Page) => page.evaluate(() => window.__LWW__!.host.debugObjects()) as Promise<DebugObject[]>;

export async function find(page: Page, type: string, i = 0): Promise<DebugObject> {
  const o = (await objects(page)).filter((x) => x.type === type)[i];
  if (!o) throw new Error(`No object of type ${type}`);
  return o;
}

export async function byId(page: Page, id: string): Promise<DebugObject | undefined> {
  return (await objects(page)).find((o) => o.id === id);
}

export const toScreen = (page: Page, x: number, y: number) =>
  page.evaluate(([wx, wy]) => window.__LWW__!.host.worldToScreen(wx!, wy!), [x, y]) as Promise<{ x: number; y: number }>;

export async function tap(page: Page, p: { sx: number; sy: number } | { x: number; y: number }): Promise<void> {
  const x = 'sx' in p ? p.sx : p.x, y = 'sy' in p ? p.sy : p.y;
  await page.mouse.click(x, y);
  await page.waitForTimeout(350);
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, opts: { steps?: number; hold?: number } = {}): Promise<void> {
  const steps = opts.steps ?? 14;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await page.waitForTimeout(16);
  }
  if (opts.hold) await page.waitForTimeout(opts.hold);
  await page.mouse.up();
  await page.waitForTimeout(500);
}

/** Real touch events through the Chrome DevTools Protocol (Playwright has no touch-drag API). */
export async function touchDrag(page: Page, points: { x: number; y: number }[]): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] : [] });
  await send('touchStart', points[0]);
  for (const p of points.slice(1)) {
    await send('touchMove', p);
    await page.waitForTimeout(16);
  }
  await send('touchEnd');
  await cdp.detach();
  await page.waitForTimeout(400);
}

export async function touchTap(page: Page, p: { x: number; y: number }): Promise<void> {
  await touchDrag(page, [p]);
}

export const discovered = (page: Page) => page.evaluate(() => [...window.__LWW__!.discoveryStore.all]) as Promise<string[]>;

export const snapshot = (page: Page) => page.evaluate(() => window.__LWW__!.host.snapshot());
