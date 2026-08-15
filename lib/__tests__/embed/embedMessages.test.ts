/**
 * LAB-EV-1 Phase C — 사유 → 문구 매핑 (W4).
 *
 * "모든 실패 사유에 3언어 문구가 있다"를 여기서 지킨다. 컴포넌트 안 if-else였다면
 * 새 사유가 늘 때 조용히 빈 칸이 됐을 자리다.
 */
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import {
  inspectErrorMessage,
  rowMessage,
  statusMessage,
  verdictMessages,
} from "@/lib/lab/embedMessages";
import type { BatchRow } from "@/lib/embed/parseBatch";
import type { LinkVerdict, VerdictReason } from "@/lib/embed/verdict";
import { inspectErrorCode } from "@/lib/lab/inspectYouTube";

const ALL_VERDICT_REASONS: VerdictReason[] = [
  "not-found",
  "not-embeddable",
  "private",
  "region-blocked",
  "region-limited",
  "age-restricted",
  "live",
  "too-short",
];

function verdict(reasons: VerdictReason[], overrides: Partial<LinkVerdict> = {}): LinkVerdict {
  return {
    videoId: "9bZkp7q19f0",
    exists: true,
    embeddable: true,
    regionBlockedIn: [],
    regionAllowedOnly: [],
    ageRestricted: false,
    isLive: false,
    durationSec: 232,
    title: "",
    channelTitle: "",
    thumbnailUrl: "",
    status: "warn",
    reasons,
    ...overrides,
  };
}

describe("verdictMessages", () => {
  it("모든 판정 사유에 3언어 문구가 있다", () => {
    for (const reason of ALL_VERDICT_REASONS) {
      const [msg] = verdictMessages(verdict([reason]));
      expect(msg, reason).toBeTruthy();
      const entry = MESSAGES[msg.key] as { ko: string; en: string; es?: string };
      expect(entry.ko, `${reason}.ko`).toBeTruthy();
      expect(entry.en, `${reason}.en`).toBeTruthy();
      expect(entry.es, `${reason}.es`).toBeTruthy();
    }
  });

  it("지역 차단은 국가 목록을 문구에 실어 보낸다", () => {
    const [msg] = verdictMessages(verdict(["region-blocked"], { regionBlockedIn: ["KR", "JP"] }));
    expect(msg.vars).toEqual({ countries: "KR, JP" });
  });

  it("허용 지역 한정도 목록을 싣는다", () => {
    const [msg] = verdictMessages(verdict(["region-limited"], { regionAllowedOnly: ["US"] }));
    expect(msg.vars).toEqual({ countries: "US" });
  });

  it("사유가 없으면 문구도 없다", () => {
    expect(verdictMessages(verdict([]))).toEqual([]);
  });
});

describe("rowMessage", () => {
  const row = (over: Partial<BatchRow>): BatchRow => ({ index: 1, raw: "", ok: false, ...over });

  it("통과한 행은 문구가 없다", () => {
    expect(rowMessage(row({ ok: true, reason: undefined }), 48)).toBeNull();
  });

  it("중복은 처음 나온 행 번호를 문구에 넣는다", () => {
    expect(rowMessage(row({ reason: "duplicate", duplicateOfIndex: 3 }), 48)).toEqual({
      key: "lab.embed.reason.duplicate",
      vars: { n: 3 },
    });
  });

  it("정원 초과는 정원 수를 넣는다", () => {
    expect(rowMessage(row({ reason: "over-limit" }), 24)).toEqual({
      key: "lab.embed.reason.overLimit",
      vars: { limit: 24 },
    });
  });

  it("파싱 실패 사유마다 문구가 있다", () => {
    for (const reason of ["not-youtube", "no-video-id", "not-a-link"] as const) {
      const msg = rowMessage(row({ reason }), 48);
      expect(msg, reason).not.toBeNull();
      const entry = MESSAGES[msg!.key] as { es?: string };
      expect(entry.es, `${reason}.es`).toBeTruthy();
    }
  });
});

describe("statusMessage · inspectErrorMessage", () => {
  it("3색 상태에 문구가 있다", () => {
    for (const status of ["pass", "warn", "blocked"] as const) {
      expect(MESSAGES[statusMessage(status).key]).toBeTruthy();
    }
  });

  it("콜러블 에러 코드가 문구로 매핑된다", () => {
    expect(inspectErrorMessage(inspectErrorCode({ code: "functions/permission-denied" })).key).toBe(
      "lab.embed.error.permission",
    );
    expect(inspectErrorMessage(inspectErrorCode({ code: "resource-exhausted" })).key).toBe(
      "lab.embed.error.quota",
    );
    expect(inspectErrorMessage(inspectErrorCode(new Error("boom"))).key).toBe(
      "lab.embed.error.failed",
    );
  });
});
