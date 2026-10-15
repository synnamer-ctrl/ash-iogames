import type { CombinationRule, ComboTrigger, Matcher } from '../../data/combinations';
import type { ObjectState } from '../../types/game';

/** The minimum an object must expose to take part in combinations. */
export interface Combinable {
  id: string;
  type: string;
  tags: readonly string[];
  state: ObjectState;
}

export interface ComboMatch<T extends Combinable> {
  rule: CombinationRule;
  target: T | null;
  zone: string | null;
}

export function matches(m: Matcher, o: Combinable): boolean {
  if (m.type !== undefined) {
    const types = typeof m.type === 'string' ? [m.type] : m.type;
    if (!types.includes(o.type)) return false;
  }
  if (m.tag !== undefined && !o.tags.includes(m.tag)) return false;
  if (m.state) {
    for (const [k, cond] of Object.entries(m.state)) {
      const v = o.state[k];
      if (typeof cond === 'object' && cond !== null) {
        if ('not' in cond && cond.not !== undefined && v === cond.not) return false;
        if (cond.gte !== undefined && !(typeof v === 'number' && v >= cond.gte)) return false;
        if (cond.lte !== undefined && !(typeof v === 'number' && v <= cond.lte)) return false;
      } else if (v !== cond) {
        return false;
      }
    }
  }
  return true;
}

const isZoneTarget = (b: CombinationRule['b']): b is { zone: string } => 'zone' in b;

/**
 * Find the first rule (in priority order) that combines `actor` with one of
 * the candidate objects (nearest first) or one of the zones it is inside.
 */
export function findCombination<T extends Combinable>(
  rules: readonly CombinationRule[],
  trigger: ComboTrigger,
  actor: Combinable,
  candidates: readonly T[],
  zones: readonly string[],
): ComboMatch<T> | null {
  for (const rule of rules) {
    if (rule.trigger !== trigger) continue;
    if (!matches(rule.a, actor)) continue;
    const b = rule.b;
    if (isZoneTarget(b)) {
      if (zones.includes(b.zone)) return { rule, target: null, zone: b.zone };
      continue;
    }
    const target = candidates.find((c) => c.id !== actor.id && matches(b, c));
    if (target) return { rule, target, zone: null };
  }
  return null;
}
