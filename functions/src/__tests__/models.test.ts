/**
 * AI-1 §5 A — 모델 상수 회귀 가드.
 *
 * 왜 이 테스트가 있나: Sonnet 5는 `thinking`을 **생략하면 adaptive가 켜진다**(4.6은
 * 꺼짐). 그러면 max_tokens를 사고와 응답이 나눠 쓰고 사고 토큰이 출력 단가로 나간다.
 * "모델 문자열만 바꾸면 되겠지"로 되돌아가는 걸 막는 그물이다.
 *
 * 모델 ID는 docs.claude.com 실측(2026-08-16). 바꿀 땐 문서를 다시 확인하고 이 테스트도
 * 같이 고칠 것 — 테스트가 먼저 깨져야 정상이다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HAIKU_MODEL, SONNET_MODEL, SONNET_THINKING } from "../core/models";

describe("models — 실측 ID 고정", () => {
  it("SONNET은 최신 Sonnet(claude-sonnet-5)", () => {
    expect(SONNET_MODEL).toBe("claude-sonnet-5");
  });

  it("HAIKU는 claude-haiku-4-5 유지 (문서상 최신 Haiku)", () => {
    expect(HAIKU_MODEL).toBe("claude-haiku-4-5");
  });

  it("날짜 접미사를 붙이지 않는다 (4.6세대부터 ID 자체가 고정 스냅샷)", () => {
    for (const id of [SONNET_MODEL, HAIKU_MODEL]) {
      expect(id).not.toMatch(/-20\d{6}$/);
    }
  });
});

describe("SONNET_THINKING — 명시적 비활성 (RULE R5)", () => {
  it("thinking은 disabled다", () => {
    expect(SONNET_THINKING).toEqual({ type: "disabled" });
  });

  it("48명 채우기 콜이 thinking을 생략하지 않고 넘긴다", () => {
    const src = readFileSync(
      join(process.cwd(), "src", "aiFillContestants.ts"),
      "utf8",
    );
    expect(src).toContain("thinking: SONNET_THINKING");
  });
});
