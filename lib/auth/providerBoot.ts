/**
 * providerBoot — AuthProvider의 effect가 매 실행에서 **무엇을 할지** 정하는 순수 결정.
 *
 * 이 파일이 존재하는 이유는 실제로 난 사고 때문이다(2026-08-23). AuthProvider가
 * `useRef` 가드로 effect **본문 전체**를 "한 번만"으로 잠그고 있었다:
 *
 *   if (bootRanRef.current) return;      // ← 두 번째 실행은 여기서 끝났다
 *   bootRanRef.current = true;
 *   const unsub = onAuthStateChanged(…);
 *   return unsub;                        // ← 첫 cleanup에서 리스너가 떨어졌다
 *
 * React 18 StrictMode의 dev 재마운트는 mount → cleanup → mount인데 **ref는 그
 * 사이에 초기화되지 않는다.** 그래서 ①첫 실행이 구독하고 ②cleanup이 해지하고
 * ③둘째 실행은 조기 return → **리스너가 하나도 없는 상태**가 됐다. `setUser`가
 * 영원히 안 불려 `authStore.loading`이 true로 굳었고 `/admin/lab`은 "확인 중…"에서
 * 멈췄다. 프로덕션은 이중 호출을 하지 않으므로 **로컬에서만** 터졌고, 그래서
 * 프리뷰·배포 CI가 전부 green인 채로 7주를 살아남았다.
 *
 * 교훈은 "ref 가드를 쓰지 말라"가 아니라 **무엇에 씌우느냐**다. 일회성 부수효과
 * (`getRedirectResult`)는 페이지 로드당 한 번이 맞고, 구독은 매 실행마다 다시
 * 붙어야 한다 — 구독/해지는 싸고 멱등이며 cleanup이 짝을 맞춘다.
 *
 * 그 구분을 컴포넌트 안 조건문으로 두면 다음 사람이 또 통째로 잠근다. 저장소가
 * 컴포넌트 렌더 테스트를 금지하므로(jsdom 미설치·§0.5) 결정을 여기로 빼서
 * 테스트로 잠근다 — B-2 이래의 "게이트는 테스트된 lib, 컴포넌트는 얇은 스위치" 관례.
 */

/** effect 한 번의 실행에서 할 일. */
export interface AuthBootPlan {
  /**
   * `getRedirectResult`를 읽는다 — 페이지 로드당 **한 번**.
   * 리디렉트 로그인(팝업 차단·iOS Safari 폴백)의 결과를 회수하는 일회성 호출이다.
   */
  readRedirect: boolean;
  /**
   * `onAuthStateChanged`를 구독한다 — **언제나 참**.
   *
   * 상수처럼 보이지만 이것이 이 모듈이 지키는 불변식이다. 어떤 입력에서도 false가
   * 되지 않는다는 것을 테스트가 잠근다. false가 되는 순간 앱은 오류 하나 없이
   * 모든 인증 게이트에서 멈춘다.
   */
  subscribe: boolean;
}

/**
 * @param redirectAlreadyRead 이 페이지 로드에서 이미 리디렉트 결과를 읽었는가.
 *   호출부는 `useRef`로 들고 있다 — StrictMode 재마운트를 넘어 살아남아야 하므로
 *   state가 아니라 ref여야 한다(그게 이 값의 존재 이유다).
 */
export function planAuthBoot(redirectAlreadyRead: boolean): AuthBootPlan {
  return {
    readRedirect: !redirectAlreadyRead,
    // 재마운트든 첫 마운트든 구독은 무조건 다시 붙인다.
    subscribe: true,
  };
}
