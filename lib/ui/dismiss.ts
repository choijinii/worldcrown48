/**
 * dismiss — "이 오버레이를 닫는다"를 컴포넌트가 소유하게 하는 훅 두 개.
 *
 * 왜 필요한가. 저장소의 모든 오버레이가 `focus-trap-react`의 `onDeactivate`를
 * **"사용자가 닫았다"** 신호로 써 왔다. 그런데 focus-trap은 **언마운트 정리에서도**
 * 그걸 부른다. React 18 StrictMode의 dev 재마운트는 mount → cleanup → mount라서
 * cleanup의 deactivate가 곧바로 `onDeactivate`를 때리고, 부모가 상태를 닫아 버려
 * 두 번째 mount 때는 띄울 것이 없다. 증상은 "버튼을 눌렀는데 창이 아예 안 보인다"이고,
 * 프로덕션은 이중 호출을 안 하므로 **로컬 개발만** 막는다.
 *
 * 실측(2026-08-23): `reactStrictMode: true`에서 검수기 모달 DOM 잔존 false,
 * `false`로 바꾸면 true. 그래서 focus-trap에는 **포커스 가두기만** 맡기고 닫기는
 * 우리가 갖는다.
 *
 * 덤으로 더 오래된 함정 하나도 같이 사라진다: focus-trap-react는
 * `focusTrapOptions.onDeactivate`를 **생성 시점에 얼려서** 다시 동기화하지 않는다.
 * 그래서 `busy` 같은 state를 닫힘 가드로 쓰려면 ref 미러가 필요했다
 * (LoginModal·DeleteAccountModal·ConsentModal에 그 주석이 남아 있었다). 여기서는
 * 평범한 effect라 매 렌더의 최신 값을 그대로 읽는다 — `enabled`에 state를 바로 넘기면 된다.
 */
import { useEffect, useRef, type RefObject } from "react";

/**
 * Escape로 닫기.
 *
 * @param onClose 닫기 동작.
 * @param enabled false면 듣지 않는다. 진행 중인 작업을 Escape로 끊으면 안 되는
 *   화면(로그인 중·삭제 요청 중·저장 중)이 이 인자로 자기 상태를 그대로 넘긴다.
 */
export function useEscapeClose(onClose: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, enabled]);
}

/**
 * 바깥을 누르면 닫기. 반환한 ref를 "안쪽"으로 칠 요소에 단다.
 *
 * `preventDefault`를 하지 않는다 — 예전 `allowOutsideClick: true`와 같은 약속이다.
 * 드롭다운이 닫히면서 그 클릭은 원래 대상에게 그대로 간다.
 *
 * 리스너를 다음 틱에 단다. 오버레이를 **여는 클릭**이 아직 전파 중일 때 붙이면
 * 그 클릭이 곧바로 바깥 클릭으로 잡혀 열리자마자 닫힌다.
 */
export function useOutsideClose<T extends HTMLElement>(
  onClose: () => void,
  enabled = true,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    function onPointerDown(event: PointerEvent) {
      const node = ref.current;
      if (node && !node.contains(event.target as Node)) onClose();
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [onClose, enabled]);

  return ref;
}
