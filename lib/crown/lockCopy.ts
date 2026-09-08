/**
 * 저장 잠금 문구 — Crown Card 배너 (2026-09-09 대표 승인본).
 *
 * v2.0까지 이 배너는 "미리보기는 자유 · 공유·저장은 로그인이 필요합니다"였다. v2.1에서
 * 게스트 공유가 열리면서 그 문장은 **화면에서 사실과 다른 말**이 됐다 — 잠긴 것은 저장뿐이다
 * (§16 2·3).
 *
 * 컴포넌트가 아니라 여기 사는 이유: 리포 관례상 순수 로직·데이터는 `lib/` 에 두고 node-env
 * vitest 로 검증한다(컴포넌트는 E2E 담당). 승인 문구를 .tsx 안에 두면 CI가 지켜 주지 못한다.
 * `lib/__tests__/crown/lockCopy.test.ts` 가 마침표까지 글자 단위로 고정한다 (§5 DO 7).
 *
 * es 가 없어 스페인어 팬이 영어를 보고 있었다 — v2.1에서 함께 채웠다.
 */
export const LOCK_COPY = {
  ko: {
    sub: "미리보기와 공유는 자유 · 저장하려면 로그인이 필요해요.",
    cta: "로그인",
  },
  en: {
    sub: "Preview and share freely · Sign in to save.",
    cta: "Sign in",
  },
  es: {
    sub: "Previsualiza y comparte libremente · Inicia sesión para guardar.",
    cta: "Iniciar sesión",
  },
} as const;

export type LockCopyLang = keyof typeof LOCK_COPY;
