import { describe, expect, it } from 'vitest';
import { clampCenter, clampToWorld, computeBaseZoom, pointInEllipse } from '../../src/utils/coordinates';
import { polygonCentroid } from '../../src/utils/geometry';

const D = { w: 1600, h: 1000, bleedX: 200, bleedY: 125 };

describe('camera fitting', () => {
  it('fits the whole world on a matching screen', () => {
    expect(computeBaseZoom(1600, 1000, D)).toBeCloseTo(1);
    expect(computeBaseZoom(800, 500, D)).toBeCloseTo(0.5);
  });

  it('never shows beyond the painted bleed on tall phones (pans instead)', () => {
    const z = computeBaseZoom(390, 844, D);
    expect(844 / z).toBeLessThanOrEqual(D.h + 2 * D.bleedY + 0.001);
    expect(390 / z).toBeLessThan(D.w);
  });

  it('clamps the camera centre inside the bleed', () => {
    const z = computeBaseZoom(390, 844, D);
    const c = clampCenter({ x: -5000, y: 500 }, 390, 844, z, D);
    expect(c.x - 390 / z / 2).toBeCloseTo(-D.bleedX);
    const wide = clampCenter({ x: 0, y: 0 }, 4000, 1000, 1, D);
    expect(wide.x).toBe(D.w / 2);
  });

  it('keeps dragged objects inside the world', () => {
    expect(clampToWorld({ x: -9999, y: 9999 }, D, 30)).toEqual({ x: -170, y: 1095 });
  });

  it('geometry helpers', () => {
    expect(pointInEllipse({ x: 10, y: 0 }, 0, 0, 10, 5)).toBe(true);
    expect(pointInEllipse({ x: 0, y: 6 }, 0, 0, 10, 5)).toBe(false);
    const c = polygonCentroid([[0, 0], [3, 0], [0, 3]]);
    expect(c.x).toBeCloseTo(1);
    expect(c.y).toBeCloseTo(1);
  });
});
