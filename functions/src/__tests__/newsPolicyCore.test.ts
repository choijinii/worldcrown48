/**
 * NEWS-1 · 4층 TIOZ 편집 방침 저장 검사 (결정 H) — 30줄 · 줄마다 200자 · 이유 필수 · 넘으면 저장 거절.
 */
import { describe, expect, it } from "vitest";
import { normalizePolicySave, NEWS_POLICY_DOC } from "../core/newsPolicyCore";

const line = (i: number, extra: Record<string, unknown> = {}) => ({ text: `줄 ${i}`, reason: `이유 ${i}`, ...extra });

describe("normalizePolicySave", () => {
  it("자리 = config/newsPolicy", () => {
    expect(NEWS_POLICY_DOC).toBe("config/newsPolicy");
  });

  it("30줄은 받는다 · 날짜 없는 줄은 오늘(KST) · 있는 줄은 그대로", () => {
    const lines = Array.from({ length: 30 }, (_, i) => line(i));
    lines[0] = line(0, { addedAt: "2026-11-01" });
    const r = normalizePolicySave({ lines }, "2026-11-27");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines).toHaveLength(30);
    expect(r.lines[0].addedAt).toBe("2026-11-01");
    expect(r.lines[1]).toEqual({ text: "줄 1", reason: "이유 1", addedAt: "2026-11-27" });
  });

  it("31번째 줄은 거절", () => {
    const r = normalizePolicySave({ lines: Array.from({ length: 31 }, (_, i) => line(i)) }, "2026-11-27");
    expect(r).toEqual({ ok: false, code: "too-many-lines" });
  });

  it("201자 줄은 거절 · 200자는 받는다", () => {
    expect(normalizePolicySave({ lines: [{ text: "가".repeat(201), reason: "r" }] }, "2026-11-27")).toEqual({ ok: false, code: "line-too-long" });
    expect(normalizePolicySave({ lines: [{ text: "가".repeat(200), reason: "r" }] }, "2026-11-27").ok).toBe(true);
  });

  it("이유가 없거나 빈 줄 · 글이 빈 줄은 거절", () => {
    expect(normalizePolicySave({ lines: [{ text: "x" }] }, "2026-11-27")).toEqual({ ok: false, code: "reason-required" });
    expect(normalizePolicySave({ lines: [{ text: "x", reason: "  " }] }, "2026-11-27")).toEqual({ ok: false, code: "reason-required" });
    expect(normalizePolicySave({ lines: [{ text: " ", reason: "r" }] }, "2026-11-27")).toEqual({ ok: false, code: "text-required" });
  });

  it("kinds — 다섯 종류 안에서만 · 빈 목록은 칸을 뺀다(= 전체)", () => {
    const ok = normalizePolicySave({ lines: [line(1, { kinds: ["weekly", "open"] }), line(2, { kinds: [] })] }, "2026-11-27");
    expect(ok.ok && ok.lines.map((l) => l.kinds)).toEqual([["weekly", "open"], undefined]);
    expect(normalizePolicySave({ lines: [line(1, { kinds: ["sports"] })] }, "2026-11-27")).toEqual({ ok: false, code: "bad-kind" });
  });

  it("모양이 틀리면 거절 · 앞뒤 빈칸은 다듬는다", () => {
    expect(normalizePolicySave({}, "2026-11-27")).toEqual({ ok: false, code: "bad-shape" });
    expect(normalizePolicySave({ lines: [42] }, "2026-11-27")).toEqual({ ok: false, code: "bad-shape" });
    const r = normalizePolicySave({ lines: [{ text: "  줄  ", reason: " 이유 " }] }, "2026-11-27");
    expect(r.ok && r.lines[0]).toEqual({ text: "줄", reason: "이유", addedAt: "2026-11-27" });
  });

  it("빈 목록(모두 지움)은 받는다", () => {
    expect(normalizePolicySave({ lines: [] }, "2026-11-27")).toEqual({ ok: true, lines: [] });
  });
});
