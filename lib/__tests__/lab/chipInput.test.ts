/**
 * EDITOR-FIX-1 — 한글(IME) 조합 중 Enter·쉼표가 칩을 확정하지 않는다.
 *
 * 결함(10/17): "키워드"를 치고 Enter → 조합 중이던 마지막 글자 "드"가 따로 칩이 됐다.
 * 조합 중 keydown 은 isComposing=true(또는 keyCode 229)로 온다 — 그때 확정하면
 * 확정 직후 IME 가 "드"를 빈 칸에 다시 써 넣는다.
 *
 * 아래 시험은 키워드 칩 입력이 받는 이벤트 순서를 그대로 흉내 낸다.
 */
import { describe, expect, it } from "vitest";
import { chipKeyAction, isImeComposing, splitCommaDraft } from "@/lib/lab/chipInput";
import { validateKeywords } from "@/lib/lab/keywordsValidation";

/** KeywordChips 의 상태 기계를 그대로 돌리는 작은 모형. */
function chipBox() {
  let chips: string[] = [];
  let draft = "";
  function commit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    chips = validateKeywords([...chips, trimmed]).values;
  }
  return {
    get chips() {
      return chips;
    },
    type(text: string, isComposing: boolean) {
      draft = text;
      if (isComposing) return;
      const split = splitCommaDraft(draft);
      split.commits.forEach(commit);
      draft = split.rest;
    },
    key(key: string, opts: { isComposing?: boolean; keyCode?: number } = {}) {
      const action = chipKeyAction({
        key,
        isComposing: opts.isComposing,
        keyCode: opts.keyCode,
        draftEmpty: draft === "",
        hasChips: chips.length > 0,
      });
      if (action === "commit") {
        commit(draft);
        draft = "";
      } else if (action === "pop") {
        chips = chips.slice(0, -1);
      }
    },
  };
}

describe("isImeComposing", () => {
  it("is true while the IME is composing", () => {
    expect(isImeComposing({ isComposing: true, keyCode: 13 })).toBe(true);
  });
  it("is true for keyCode 229 (Safari·옛 Chrome 이 조합 중에 보내는 값)", () => {
    expect(isImeComposing({ isComposing: false, keyCode: 229 })).toBe(true);
  });
  it("is false for a plain key", () => {
    expect(isImeComposing({ isComposing: false, keyCode: 13 })).toBe(false);
  });
});

describe("chipKeyAction", () => {
  it("does NOT commit on Enter while composing", () => {
    expect(
      chipKeyAction({ key: "Enter", isComposing: true, draftEmpty: false, hasChips: false }),
    ).toBe("none");
  });
  it("does NOT commit on Enter with keyCode 229", () => {
    expect(
      chipKeyAction({ key: "Enter", keyCode: 229, draftEmpty: false, hasChips: false }),
    ).toBe("none");
  });
  it("does NOT commit on comma while composing", () => {
    expect(
      chipKeyAction({ key: ",", isComposing: true, draftEmpty: false, hasChips: false }),
    ).toBe("none");
  });
  it("does NOT pop the last chip on Backspace while composing", () => {
    expect(
      chipKeyAction({ key: "Backspace", isComposing: true, draftEmpty: true, hasChips: true }),
    ).toBe("none");
  });
  it("commits on Enter / comma once composition is over", () => {
    expect(chipKeyAction({ key: "Enter", draftEmpty: false, hasChips: false })).toBe("commit");
    expect(chipKeyAction({ key: ",", draftEmpty: false, hasChips: false })).toBe("commit");
  });
  it("pops the last chip on Backspace with an empty draft", () => {
    expect(chipKeyAction({ key: "Backspace", draftEmpty: true, hasChips: true })).toBe("pop");
  });
});

describe("splitCommaDraft", () => {
  it("leaves text without a comma alone", () => {
    expect(splitCommaDraft("키워드")).toEqual({ commits: [], rest: "키워드" });
  });
  it("commits everything before the last comma", () => {
    expect(splitCommaDraft("키워드,")).toEqual({ commits: ["키워드"], rest: "" });
    expect(splitCommaDraft("a,b,c")).toEqual({ commits: ["a", "b"], rest: "c" });
  });
});

describe("한글 키워드 — 이벤트 순서 그대로", () => {
  it("조합 중 Enter → 확정 안 됨, 조합 끝난 뒤 Enter → 키워드 하나", () => {
    const box = chipBox();
    box.type("키워", false);
    box.type("키워드", true); // "드" 조합 중
    box.key("Enter", { isComposing: true, keyCode: 229 });
    expect(box.chips).toEqual([]);
    box.type("키워드", false); // compositionend
    box.key("Enter");
    expect(box.chips).toEqual(["키워드"]);
  });

  it("쉼표도 같다 — 조합 중 쉼표는 확정하지 않고, 조합이 끝나 들어온 쉼표가 확정한다", () => {
    const box = chipBox();
    box.type("키워드", true);
    box.key(",", { isComposing: true, keyCode: 229 });
    expect(box.chips).toEqual([]);
    // 조합이 끝나며 쉼표 글자가 입력칸에 들어온다
    box.type("키워드,", false);
    expect(box.chips).toEqual(["키워드"]);
  });

  it("조합이 끝난 뒤 쉼표 키 → 키워드 하나", () => {
    const box = chipBox();
    box.type("키워드", false);
    box.key(",");
    expect(box.chips).toEqual(["키워드"]);
  });
});
