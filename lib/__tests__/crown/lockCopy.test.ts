/**
 * 저장 잠금 문구 — 2026-09-09 대표 승인본을 글자 단위로 고정한다.
 *
 * v2.1에서 게스트 공유가 열리면서 "미리보기는 자유 · 공유·저장은 로그인이 필요합니다"가
 * **화면에서 사실과 다른 문장**이 됐다. 잠긴 것은 저장뿐이다(§16 2·3).
 *
 * 이 문구는 §8 표가 아니라 별도 상수다. 컴포넌트(.tsx) 안에 두면 node-env vitest 가 못 읽어
 * CI가 지켜 주지 못하므로 `lib/crown/lockCopy.ts` 로 뺐다. 승인본은 마침표까지 그대로다(§5 DO 7).
 */
import { describe, expect, it } from "vitest";
import { LOCK_COPY } from "@/lib/crown/lockCopy";

describe("저장 잠금 배너 (2026-09-09 대표 승인본)", () => {
  it("ko — 마침표까지 승인본과 같다", () => {
    expect(LOCK_COPY.ko.sub).toBe(
      "미리보기와 공유는 자유 · 저장하려면 로그인이 필요해요.",
    );
  });

  it("en — '·' 뒤는 대문자 Sign in 이다", () => {
    expect(LOCK_COPY.en.sub).toBe("Preview and share freely · Sign in to save.");
  });

  it("es — libremente 가 들어간다", () => {
    expect(LOCK_COPY.es.sub).toBe(
      "Previsualiza y comparte libremente · Inicia sesión para guardar.",
    );
  });

  it("세 언어가 모두 있다 — es 팬이 영어를 보지 않는다", () => {
    // v2.0까지 이 상수에 ko·en 두 언어만 있어 스페인어 팬은 영어를 보고 있었다.
    for (const lang of ["ko", "en", "es"] as const) {
      expect(LOCK_COPY[lang].sub, lang).toBeTruthy();
      expect(LOCK_COPY[lang].cta, lang).toBeTruthy();
    }
  });

  it("공유가 잠겼다고 말하지 않는다 — v2.1의 사실은 저장만 잠긴다는 것이다", () => {
    expect(LOCK_COPY.ko.sub).not.toContain("공유는 로그인");
    expect(LOCK_COPY.ko.sub).not.toContain("공유·저장은");
    expect(LOCK_COPY.en.sub).not.toMatch(/sign in to share/i);
    expect(LOCK_COPY.es.sub).not.toMatch(/para compartir/i);
  });
});
