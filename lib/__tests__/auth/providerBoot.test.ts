/**
 * AuthProvider 부팅 결정 — StrictMode 재마운트 회귀 방지 (2026-08-23).
 *
 * 잡으려는 사고: effect 본문 전체를 ref로 잠가서 StrictMode 재마운트 뒤 auth
 * 리스너가 하나도 남지 않았던 것. 증상은 오류 0 + 모든 인증 게이트가 스피너에서
 * 정지(`/admin/lab` → "확인 중…")였고, 프로덕션은 이중 호출을 안 해 로컬에서만
 * 터졌다 — 그래서 CI가 전부 green인 채로 7주를 살아남았다.
 *
 * 렌더 테스트로는 못 잡는다(이 저장소는 jsdom 미설치·컴포넌트 렌더 테스트 금지).
 * 대신 effect의 **결정**을 순수 함수로 뽑아 여기서 수명주기를 그대로 재생한다.
 */
import { describe, expect, it } from "vitest";
import { planAuthBoot } from "@/lib/auth/providerBoot";

/**
 * effect 수명주기 재생.
 *
 * 요점은 `redirectRead`가 **루프 밖에** 산다는 것이다 — 컴포넌트의 `useRef`가
 * 재마운트를 넘어 살아남는 것과 같다. 사고의 원인이 정확히 이 지점이었다.
 */
function runLifecycle(mounts: number) {
  let redirectRead = false;
  const plans = [];
  for (let i = 0; i < mounts; i += 1) {
    const plan = planAuthBoot(redirectRead);
    if (plan.readRedirect) redirectRead = true;
    plans.push(plan);
    // 매 마운트의 cleanup이 구독을 해지한다 — 다음 마운트가 다시 붙여야 한다.
  }
  return plans;
}

describe("planAuthBoot", () => {
  it("첫 실행은 리디렉트 결과를 읽고 구독한다", () => {
    expect(planAuthBoot(false)).toEqual({ readRedirect: true, subscribe: true });
  });

  it("리디렉트 결과는 페이지 로드당 한 번만 읽는다", () => {
    const plans = runLifecycle(2);
    expect(plans.map((p) => p.readRedirect)).toEqual([true, false]);
  });

  it("★회귀: StrictMode 재마운트에서도 구독은 반드시 다시 붙는다", () => {
    // 이 단언이 깨지면 앱은 오류 하나 없이 모든 인증 게이트에서 멈춘다.
    const plans = runLifecycle(2);
    expect(plans.every((p) => p.subscribe)).toBe(true);
  });

  it("★회귀: 몇 번을 재마운트해도 구독을 거르는 실행은 없다", () => {
    const plans = runLifecycle(5);
    expect(plans.filter((p) => p.subscribe)).toHaveLength(5);
    // 그래도 리디렉트는 여전히 한 번뿐이다 — 두 규칙이 서로를 덮지 않는다.
    expect(plans.filter((p) => p.readRedirect)).toHaveLength(1);
  });

  it("어떤 입력도 구독을 끄지 못한다", () => {
    for (const already of [true, false]) {
      expect(planAuthBoot(already).subscribe).toBe(true);
    }
  });
});
