/**
 * compare-colors.lib.mjs — pure logic for the colour-regression harness.
 *
 * Split from the CLI so the diffing rules unit-test with no browser
 * (lib/__tests__/visualDiff.test.ts). Runnable entry: compare-colors.mjs.
 */

/**
 * Every computed property a colour change can move.
 *
 * `boxShadow` and `backgroundImage` are here because they carry colours inside
 * composite values — and because an *absent* shadow is a real visual state: a
 * `var()` that resolves to nothing invalidates the declaration, so hoisting a
 * token into scope can make a shadow appear out of nowhere. That is exactly the
 * regression this harness caught during TOK-1.
 */
export const COLOUR_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
  "boxShadow",
  "backgroundImage",
];

/**
 * Compare two DOM-order snapshots of the same route.
 *
 * A size or structure mismatch is reported as *not comparable* rather than as a
 * pile of differences — the elements no longer line up, so every subsequent
 * comparison would be noise.
 *
 * @param {object[]} base snapshot rows from the reference build
 * @param {object[]} head snapshot rows from the branch under test
 * @param {string[]} [props]
 * @returns {{comparable: boolean, reason?: string, count?: number, diffs: object[]}}
 */
export function diffSnapshots(base, head, props = COLOUR_PROPS) {
  if (base.length !== head.length) {
    return {
      comparable: false,
      reason: `DOM 노드 수 불일치 base=${base.length} head=${head.length}`,
      diffs: [],
    };
  }

  const diffs = [];
  for (let i = 0; i < base.length; i++) {
    const b = base[i];
    const h = head[i];
    if (b.p !== h.p) {
      return {
        comparable: false,
        reason: `DOM 구조 불일치 (#${i}) base=${b.p} head=${h.p}`,
        diffs: [],
      };
    }
    for (const prop of props) {
      if (b[prop] !== h[prop]) {
        diffs.push({ path: b.p, prop, base: b[prop], head: h[prop] });
      }
    }
  }
  return { comparable: true, count: base.length, diffs };
}

/**
 * Roll per-route results into a verdict.
 *
 * A route that could not be compared counts as a failure, not a pass: it proves
 * nothing, and silently skipping it would hide a regression on the very page
 * that failed to load.
 *
 * @param {{route: string, comparable: boolean, count?: number, diffs: object[]}[]} results
 */
export function summarise(results) {
  const skipped = results.filter((r) => !r.comparable).length;
  const differences = results.reduce((n, r) => n + r.diffs.length, 0);
  const elements = results.reduce((n, r) => n + (r.count ?? 0), 0);
  return { ok: differences === 0 && skipped === 0, elements, differences, skipped };
}

/**
 * The in-page snapshot function, as source. Walks the body in document order
 * and records the computed colour properties of every element.
 *
 * Script/style/link nodes are skipped: they render nothing, and their count
 * varies between builds (chunk splitting), which would break the alignment
 * check for no visual reason.
 *
 * @param {string[]} [props]
 */
export function snapshotSource(props = COLOUR_PROPS) {
  return `(() => {
  const props = ${JSON.stringify(props)};
  const skip = ["SCRIPT", "STYLE", "LINK", "NOSCRIPT", "TEMPLATE"];
  const out = [];
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    const row = { p: path, t: el.tagName };
    for (const k of props) row[k] = cs[k];
    out.push(row);
    [...el.children]
      .filter((c) => !skip.includes(c.tagName))
      .forEach((c, i) => walk(c, path + "/" + i + ":" + c.tagName));
  };
  walk(document.body, "body");
  return out;
})()`;
}
