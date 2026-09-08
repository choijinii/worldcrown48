/**
 * Crown Card 액션 게이트 — v2.1 공유 개방 / 저장 잠금 (§16 2·3, 2026-09-06 대표 확정).
 *
 * v2.0까지 `canShare` 하나가 공유와 저장을 **함께** 잠갔다(C-2 AC-9/10, HF-2 공유 게이트).
 * v2.1은 둘을 가른다:
 *   - **공유**(X · 네이티브 공유 시트 · 링크)는 게스트에게 **열린다.** 공유 링크 규격은
 *     로그인과 동일하고(`withShareUtm` 그대로) uid를 노출하지 않는다(§16 실측 4).
 *   - **저장(다운로드)**만 로그인 게이트로 남는다 — v2.1의 로그인 유인은 "간직하려면"이다.
 *
 * 판정을 한 함수로 모으는 이유: 지금 이 판정이 모달·버튼·CSS 세 곳에 흩어져 있어서, 가르다가
 * 한 곳을 빠뜨리면 "공유는 열렸는데 버튼은 비활성"이 남는다.
 */
export interface CrownActionState {
  /** 공유 — v2.1부터 언제나 열려 있다. */
  canShare: boolean;
  /** 저장·다운로드 — 로그인(비익명)만. */
  canSave: boolean;
}

export function crownActionState(args: { isSignedIn: boolean }): CrownActionState {
  return { canShare: true, canSave: args.isSignedIn };
}
