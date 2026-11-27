/**
 * NEWS-2 · 결정 J — 경고가 남은 초안은 발행하지 못한다 · 저장 때 서버가 다시 검사 · [경고 풀기].
 * 순수 판단(newsCheckState): 다시 검사할 때 문서에 적을 칸 · 경고 풀기 계획.
 */
import { describe, expect, it } from "vitest";
import { planClearWarnings, recheckPatch, warningKey } from "../core/newsCheckState";
import type { ArticleBlock } from "../_news/articleDoc";

const body = (text: string): ArticleBlock[] => [{ type: "lead", text }];
const L = (ko: string, en = "fans", es = "fans") => ({ ko, en, es });
const doc = (koLead: string, extra: Record<string, unknown> = {}) => ({
  status: "draft",
  title: L("제목"),
  subhead: L(""),
  body: { ko: body(koLead), en: body("fans"), es: body("fans") },
  ...extra,
});

describe("recheckPatch — 저장 뒤 다시 검사", () => {
  it("처음(checkedText 없음) — 경고 · 검사한 글 · 잠금 여부를 적는다", () => {
    const p = recheckPatch(doc("애정 전쟁의 시작"));
    expect(p).not.toBeNull();
    expect(p!.checkWarnings).toEqual([{ rule: "forbidden_word", lang: "ko", field: "body.0", match: "전쟁" }]);
    expect(p!.checkBlocked).toBe(true);
    expect(p!.checkedText).toEqual({ title: L("제목"), subhead: L(""), body: { ko: body("애정 전쟁의 시작"), en: body("fans"), es: body("fans") } });
  });

  it("글이 검사한 글과 같으면 아무것도 쓰지 않는다(조회 수 같은 다른 칸 저장 · 자기 쓰기)", () => {
    const first = recheckPatch(doc("설렘의 시작"))!;
    expect(first.checkBlocked).toBe(false);
    expect(recheckPatch(doc("설렘의 시작", { ...first, views: 9 }))).toBeNull();
  });

  it("글을 고치면 다시 검사 — 경고가 사라지면 풀린다", () => {
    const first = recheckPatch(doc("애정 전쟁"))!;
    const p = recheckPatch(doc("애정이 모이는 자리", first));
    expect(p!.checkWarnings).toEqual([]);
    expect(p!.checkBlocked).toBe(false);
  });

  it("이미 푼 같은 경고로는 다시 잠그지 않는다 · 새 경고는 다시 잠근다", () => {
    const first = recheckPatch(doc("애정 전쟁"))!;
    const cleared = [{ ...first.checkWarnings[0], by: "op", at: 1 }];
    // 같은 경고(전쟁) + 다른 글 고침 → 잠기지 않음
    const same = recheckPatch(doc("애정 전쟁 !", { ...first, clearedWarnings: cleared }))!;
    expect(same.checkWarnings.map(warningKey)).toEqual(["forbidden_word|ko|body.0|전쟁"]);
    expect(same.checkBlocked).toBe(false);
    // 새 경고(투표) → 다시 잠김
    const added = recheckPatch(doc("애정 전쟁과 투표", { ...first, clearedWarnings: cleared }))!;
    expect(added.checkBlocked).toBe(true);
  });

  it("발행된 기사도 다시 검사해 경고만 적는다(상태는 건드리지 않는다)", () => {
    const p = recheckPatch(doc("애정 전쟁", { status: "published" }))!;
    expect(p.checkBlocked).toBe(true);
    expect(p).not.toHaveProperty("status");
  });
});

describe("planClearWarnings — [경고 풀기]", () => {
  const checked = (lead: string) => {
    const d = doc(lead);
    return { ...d, ...recheckPatch(d)! };
  };

  it("지금 경고를 모두 풀림으로 적는다(누가 · 언제) · 잠금 해제 · 기록에 남길 경고", () => {
    const r = planClearWarnings(checked("애정 전쟁과 투표"), "op-uid", 1000);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cleared.map(warningKey)).toEqual(["forbidden_word|ko|body.0|전쟁", "forbidden_word|ko|body.0|투표"]);
    expect(r.patch.checkBlocked).toBe(false);
    expect(r.patch.clearedWarnings).toEqual(r.cleared.map((w) => ({ ...w, by: "op-uid", at: 1000 })));
  });

  it("이미 푼 경고는 다시 적지 않는다(기록에 남지 않음)", () => {
    const first = planClearWarnings(checked("애정 전쟁"), "a", 1);
    if (!first.ok) throw new Error("x");
    const again = planClearWarnings({ ...checked("애정 전쟁"), ...first.patch }, "b", 2);
    expect(again.ok && again.cleared).toEqual([]);
    expect(again.ok && again.patch.clearedWarnings).toHaveLength(1);
  });

  it("글을 고친 뒤 아직 다시 검사하지 않았으면 거절(check-pending) — 본 적 없는 경고를 풀지 않게", () => {
    const d = { ...checked("애정 전쟁"), body: { ko: body("새 글 투표"), en: body("fans"), es: body("fans") } };
    expect(planClearWarnings(d, "op", 1)).toEqual({ ok: false, code: "check-pending" });
  });

  it("문서가 없으면 not-found", () => {
    expect(planClearWarnings(undefined, "op", 1)).toEqual({ ok: false, code: "not-found" });
  });
});
