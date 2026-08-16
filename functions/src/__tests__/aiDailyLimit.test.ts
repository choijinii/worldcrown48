/**
 * AI-1 §5 B — 편집기 AI 콜러블의 교차 인스턴스 일일 상한.
 *
 * 콜러블 자체는 Firestore/Anthropic 얇은 어댑터이고, **결정**은 전부 이 순수 코어에
 * 있다 (newsRateLimit·participation과 같은 구조). 어드민 거부는 requireAdmin이
 * 담당하므로 requireAdmin.test.ts가 그 층을 덮는다 — 여기서는 두 콜러블이 실제로
 * 그 유틸을 첫 줄에 물고 있는지까지 확인한다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AI_DAILY_LIMIT_DEFAULT,
  AI_ERROR_CODES,
  aiUsageCountField,
  aiUsageDocId,
  decideAiCall,
  resolveAiDailyLimit,
} from "../core/aiDailyLimit";
import { kstDate } from "../core/voteRecord";

describe("decideAiCall — 50/KST일", () => {
  it("상한 아래는 허용, 상한부터 거부 (51회째 거부)", () => {
    expect(decideAiCall(0).status).toBe("allowed");
    expect(decideAiCall(49).status).toBe("allowed"); // 50회째 호출
    expect(decideAiCall(50).status).toBe("limit_reached"); // 51회째 호출
    expect(decideAiCall(51).status).toBe("limit_reached");
  });

  it("상한은 주입 가능하다 (env 조정용)", () => {
    expect(decideAiCall(4, 5).status).toBe("allowed");
    expect(decideAiCall(5, 5).status).toBe("limit_reached");
  });

  it("기본 상한 50 + 안정 에러 코드", () => {
    expect(AI_DAILY_LIMIT_DEFAULT).toBe(50);
    expect(AI_ERROR_CODES.DAILY_LIMIT).toBe("ai_daily_limit");
  });
});

describe("resolveAiDailyLimit — AI_DAILY_LIMIT 파싱", () => {
  it("정상 정수는 그대로 쓴다", () => {
    expect(resolveAiDailyLimit("120")).toBe(120);
    expect(resolveAiDailyLimit(" 7 ")).toBe(7);
  });

  it("fail-safe: 미설정·쓰레기값·0 이하·소수는 기본값으로 되돌린다", () => {
    for (const raw of [undefined, null, "", "   ", "abc", "0", "-5", "2.5", "NaN"]) {
      expect(resolveAiDailyLimit(raw)).toBe(AI_DAILY_LIMIT_DEFAULT);
    }
  });
});

describe("aiUsage 카운터 키", () => {
  it("문서 id는 KST 날짜 — 날짜가 바뀌면 새 문서(=새 쿼터)다", () => {
    // KST 자정 직전/직후 (UTC 14:59:59 → 15:00:00)
    const beforeMidnight = new Date("2026-08-16T14:59:59Z");
    const afterMidnight = new Date("2026-08-16T15:00:00Z");

    expect(aiUsageDocId(kstDate(beforeMidnight))).toBe("2026-08-16");
    expect(aiUsageDocId(kstDate(afterMidnight))).toBe("2026-08-17");
    expect(aiUsageDocId(kstDate(beforeMidnight))).not.toBe(
      aiUsageDocId(kstDate(afterMidnight)),
    );
  });

  it("같은 KST 날 안에서는 같은 문서를 쓴다 (UTC 날짜가 달라도)", () => {
    // 2026-08-16 09:00 KST(=15일 24:00 UTC)와 2026-08-16 23:00 KST는 같은 KST 날
    expect(kstDate(new Date("2026-08-16T00:00:00Z"))).toBe("2026-08-16");
    expect(kstDate(new Date("2026-08-16T13:59:00Z"))).toBe("2026-08-16");
  });

  it("종류별로 카운터 필드를 나눠 서로 굶기지 않는다", () => {
    expect(aiUsageCountField("aiFillContestants")).toBe("counts.aiFillContestants");
    expect(aiUsageCountField("aiSuggestKeywords")).toBe("counts.aiSuggestKeywords");
    expect(aiUsageCountField("aiFillContestants")).not.toBe(
      aiUsageCountField("aiSuggestKeywords"),
    );
  });
});

describe("콜러블 배선 — 어드민 게이트가 첫 줄인가 (AI-1 DoD)", () => {
  // vitest는 functions/ 에서 돈다 (npm test). ESM/CJS 어느 쪽이든 안전하게 cwd 기준.
  const read = (f: string) => readFileSync(join(process.cwd(), "src", f), "utf8");

  for (const file of ["aiFillContestants.ts", "aiSuggestKeywords.ts"]) {
    it(`${file}: requireAdmin이 핸들러 본문 첫 문장이고 ADMIN_UID를 선언한다`, () => {
      const src = read(file);
      expect(src).toContain('secrets: [ANTHROPIC_API_KEY, "ADMIN_UID"]');
      // 핸들러 본문의 첫 문장 = requireAdmin (시크릿·모델보다 먼저).
      // 반환 타입 주석에도 `{`가 있으므로 화살표 `=> {` 를 기준으로 자른다.
      const body = src.slice(src.indexOf("async (req)"));
      const firstStatement = body
        .slice(body.indexOf("=> {") + "=> {".length)
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0);
      expect(firstStatement).toContain("requireAdmin(req.auth?.uid, process.env.ADMIN_UID)");
      // 어드민 판정이 시크릿 읽기보다 앞선다
      expect(body.indexOf("requireAdmin")).toBeLessThan(body.indexOf(".value()"));
    });

    it(`${file}: 일일 상한이 모델 호출보다 앞에 걸린다`, () => {
      const src = read(file);
      const body = src.slice(src.indexOf("async (req)"));
      expect(body).toContain("consumeAiDailyQuota");
      expect(body.indexOf("consumeAiDailyQuota")).toBeLessThan(
        body.indexOf("messages.create"),
      );
    });
  }
});
