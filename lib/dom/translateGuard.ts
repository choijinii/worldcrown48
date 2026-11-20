/**
 * 번역 멈춤 그물 (팬 화면 · 2026-11-20 대표 승인 B 방법의 첫째 겹).
 *
 * 크롬(구글) 번역은 화면의 글자 마디를 <font><font>번역</font></font> 로 **바꿔 끼운다**. React 는 원래 마디를
 * 기억하고 있다가, 그 마디를 지우거나(removeChild) 그 앞에 새 마디를 끼우려(insertBefore) 할 때 DOM 이
 * NotFoundError 를 던져 화면 전체가 멈춘다 — React 저장소 이슈 #11538 의 알려진 문제이고, 이 그물은 그 이슈에서
 * React 쪽이 안내한 우회와 같은 모양이다.
 *
 * 하는 일은 두 경우뿐이다:
 *  - 지울 마디가 이미 그 부모 밑에 없으면 → 던지지 않고 그 마디를 돌려준다(이미 빠진 것을 빼는 셈).
 *  - 기준 마디가 그 부모 밑에 없으면 → 던지지 않고 끝에 붙인다(새 내용이 사라지지 않게).
 * 그 밖에는 원래 함수를 그대로 부른다. 번역된 글자가 옛 글자로 남는 문제는 둘째 겹(바뀌는 글자를 칸째 새로
 * 그리기 — key)이 맡는다. "번역하지 마세요" 표시(translate="no")는 달지 않는다(대표 2026-11-19).
 */

const GUARDED = Symbol.for("wc48.translateGuard");

interface NodeProto {
  removeChild<T>(this: unknown, child: T): T;
  insertBefore<T>(this: unknown, node: T, ref: unknown): T;
  appendChild<T>(this: unknown, node: T): T;
  [GUARDED]?: true;
}

const parentOf = (n: unknown): unknown => (n && typeof n === "object" ? (n as { parentNode?: unknown }).parentNode : undefined);

/**
 * `proto`(브라우저에서는 `Node.prototype`)의 removeChild · insertBefore 를 감싼다.
 * 처음 감쌌으면 true, 이미 감싸 있었으면 false. 경고는 페이지마다 처음 한 번만.
 */
export function installTranslateGuard(
  proto: object,
  warn: (message: string) => void = (m) => console.warn(m),
): boolean {
  const p = proto as NodeProto;
  if (p[GUARDED]) return false;
  const removeChild = p.removeChild;
  const insertBefore = p.insertBefore;
  let warned = false;
  const note = () => {
    if (warned) return;
    warned = true;
    warn("[wc48] 번역기가 바꾼 글자 마디를 건너뛰었습니다(화면 멈춤 방지).");
  };

  p.removeChild = function <T>(this: unknown, child: T): T {
    if (parentOf(child) !== this) {
      note();
      return child;
    }
    return removeChild.call(this, child) as T;
  };
  p.insertBefore = function <T>(this: unknown, node: T, ref: unknown): T {
    if (ref && parentOf(ref) !== this) {
      note();
      return p.appendChild.call(this, node) as T;
    }
    return insertBefore.call(this, node, ref) as T;
  };
  Object.defineProperty(p, GUARDED, { value: true });
  return true;
}
