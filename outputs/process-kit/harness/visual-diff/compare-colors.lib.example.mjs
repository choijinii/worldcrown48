/**
 * compare-colors.lib.example.mjs — 색상 대조 하네스의 순수 로직.
 *
 * 브라우저를 띄우지 않는다. 그래서 대조 규칙 자체를 단위테스트로 잠글 수 있다.
 * 실행 진입점은 compare-colors.example.mjs.
 */

/**
 * @typedef {Object.<string, string>} SnapshotRow
 *   요소 하나: `p`(DOM 경로) · `t`(태그) + 색상 속성별 계산값
 * @typedef {{path: string, prop: string, base: string, head: string}} ColourDiff
 * @typedef {{comparable: boolean, reason?: string, count?: number, diffs: ColourDiff[]}} RouteResult
 * @typedef {RouteResult & {route: string}} NamedRouteResult
 */

/**
 * 색 변화가 드러날 수 있는 계산 속성 전부.
 *
 * `boxShadow` 와 `backgroundImage` 가 들어 있는 건 합성값 안에 색을 품기 때문이고,
 * 더 중요하게는 **그림자가 없는 것도 실제 시각 상태**이기 때문이다. 아무것도로
 * 해석되는 `var()` 는 그 선언을 통째로 무효화하므로, 토큰을 스코프 안으로
 * 끌어올리면 없던 그림자가 갑자기 나타난다. 이 하네스가 실제로 잡은 회귀가
 * 정확히 그것이었다.
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
 * 같은 경로의 두 스냅샷(기준 빌드 · 대상 빌드)을 대조한다.
 *
 * 요소 수나 구조가 어긋나면 차이를 잔뜩 쏟아내는 대신 **비교 불가**로 보고한다 —
 * 정렬이 깨진 상태에서의 비교는 전부 노이즈다.
 *
 * @param {SnapshotRow[]} base
 * @param {SnapshotRow[]} head
 * @param {string[]} [props]
 * @returns {RouteResult}
 */
export function diffSnapshots(base, head, props = COLOUR_PROPS) {
  if (base.length !== head.length) {
    return {
      comparable: false,
      reason: `DOM 노드 수 불일치 base=${base.length} head=${head.length}`,
      diffs: [],
    };
  }

  /** @type {ColourDiff[]} */
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
 * 경로별 결과를 하나의 판정으로 굴린다.
 *
 * 비교하지 못한 경로는 통과가 아니라 **실패**로 센다: 아무것도 증명하지 못했고,
 * 조용히 넘기면 하필 그 화면의 회귀를 숨기게 된다.
 *
 * @param {NamedRouteResult[]} results
 */
export function summarise(results) {
  const skipped = results.filter((r) => !r.comparable).length;
  const differences = results.reduce((n, r) => n + r.diffs.length, 0);
  const elements = results.reduce((n, r) => n + (r.count ?? 0), 0);
  return { ok: differences === 0 && skipped === 0, elements, differences, skipped };
}

/**
 * 페이지 안에서 실행될 스냅샷 함수를 소스 문자열로 만든다.
 * body 이하를 문서 순서로 걸으며 모든 요소의 계산된 색상 속성을 기록한다.
 *
 * script/style/link 노드는 건너뛴다 — 렌더되지 않고, 빌드마다 개수가 달라져서
 * (청크 분할) 시각과 무관하게 정렬 검사를 깨뜨린다.
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
