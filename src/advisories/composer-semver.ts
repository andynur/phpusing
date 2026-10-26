// Composer version constraints as Packagist advisories write them (docs/05_ADVISORY_DATA.md).
// Mirrors composer/semver where advisories need it; anything else is "cannot evaluate" (null).

interface Version {
  parts: number[];
  /** dev < alpha < beta < RC < stable < patch, as in Composer. */
  stability: number;
  /** Number after the stability word, e.g. RC2 -> [2], beta.7.1 -> [7, 1]. */
  extra: number[];
}

const STABILITY: Record<string, number> = {
  dev: 0,
  alpha: 1,
  a: 1,
  beta: 2,
  b: 2,
  rc: 3,
  stable: 4,
  patch: 5,
  pl: 5,
  p: 5,
};
const STABLE = 4;
/** Composer's stand-in for an `x` or `*` part. */
const WILDCARD = 9_999_999;

const VERSION =
  /^v?(\d+|x|\*)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?(?:[-._]?(alpha|beta|stable|patch|dev|rc|pl|a|b|p)(?:[-._]?(\d+(?:\.\d+)*))?)?$/i;

function parse(raw: string): Version | null {
  // Date versions ("2020-09-14") are normalized to dots by Composer.
  const value = raw.trim().replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3');
  const m = VERSION.exec(value);
  if (!m) return null;
  const parts = m
    .slice(1, 5)
    .filter((p): p is string => p !== undefined)
    .map((p) => (p === 'x' || p === 'X' || p === '*' ? WILDCARD : Number(p)));
  while (parts.length < 4) parts.push(0);
  const word = m[5]?.toLowerCase();
  return {
    parts,
    stability: word === undefined ? STABLE : (STABILITY[word] ?? STABLE),
    extra: m[6]?.split('.').map(Number) ?? [],
  };
}

/** An installed version from composer.lock; branches such as `dev-main` or `1.x-dev` give null. */
export function parseInstalled(raw: string): Version | null {
  if (/dev/i.test(raw) || /[x*]/i.test(raw.replace(/^v/i, ''))) return null;
  return parse(raw);
}

function compareLists(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function compare(a: Version, b: Version): number {
  return (
    compareLists(a.parts, b.parts) || a.stability - b.stability || compareLists(a.extra, b.extra)
  );
}

function term(installed: Version, text: string): boolean | null {
  if (text === '*') return true;
  const m = /^(>=|<=|>|<|==|=|!=)?(.+)$/.exec(text);
  const op = m?.[1] ?? '=';
  const target = m?.[2] ? parse(m[2]) : null;
  if (!target) return null;
  const wild = target.parts.indexOf(WILDCARD);
  if ((op === '=' || op === '==') && wild >= 0) {
    // "1.2.*" pins only the parts before the wildcard.
    return compareLists(installed.parts.slice(0, wild), target.parts.slice(0, wild)) === 0;
  }
  // Composer reads "<1.2" and ">=1.2" as "<1.2-dev" and ">=1.2-dev": pre-releases of 1.2 sit
  // below 1.2 but are not "<1.2".
  if ((op === '<' || op === '>=') && !/[a-z]/i.test(m?.[2] ?? '')) {
    target.stability = 0;
    target.extra = [];
  }
  const c = compare(installed, target);
  switch (op) {
    case '>=':
      return c >= 0;
    case '<=':
      return c <= 0;
    case '>':
      return c > 0;
    case '<':
      return c < 0;
    case '!=':
      return c !== 0;
    default:
      return c === 0;
  }
}

/**
 * Whether `installed` satisfies `constraint` (`|`/`||` or, `,`/space and). Null when either
 * side cannot be evaluated, for example a dev branch or an operator advisories do not use.
 */
export function satisfies(installed: string, constraint: string): boolean | null {
  const version = parseInstalled(installed);
  if (!version) return null;
  let unknown = false;
  for (const group of constraint.split(/\|\|?/)) {
    const terms = group
      .trim()
      .replace(/([<>=!]=?)\s+/g, '$1')
      .split(/\s*,\s*|\s+/)
      .filter(Boolean);
    if (terms.length === 0) {
      unknown = true;
      continue;
    }
    let all: boolean | null = true;
    for (const t of terms) {
      const r = term(version, t);
      if (r === false) {
        all = false;
        break;
      }
      if (r === null) all = null;
    }
    if (all === true) return true;
    if (all === null) unknown = true;
  }
  return unknown ? null : false;
}
