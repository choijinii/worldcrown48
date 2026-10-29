/**
 * EDITOR-FIX-1 — 초안 문서 모양(tournamentDrafts/{draftId}).
 *
 * 초안 = 아직 발행하지 않은 편집 내용(제목·카테고리·설명·키워드·캠페인 이름표·마감·
 * 엔트리 48칸과 각 칸의 영상 설정). 바쁨 표시·할당량 미리보기 같은 일시 상태는 없다.
 */
import { describe, expect, it } from "vitest";
import {
  DRAFT_FIELDS,
  DRAFT_SCHEMA_VERSION,
  fromDraftDoc,
  isDraftBlank,
  phaseAfterDraftList,
  sortDraftsByUpdated,
  toDraftFields,
  type DraftEditorState,
} from "@/lib/lab/tournamentDraft";
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import { EMPTY_PICK } from "@/lib/thumbnail/pick";

function fullContestant(i: number): ContestantDraft {
  return {
    name: `Entry ${i + 1}`,
    nationality: "KR",
    affiliation: `Group ${i + 1}`,
    imageSearchKeyword: `hint ${i + 1}`,
    videoId: "dQw4w9WgXcQ",
    videoStartSec: 12,
    videoEndSec: 27,
    videoSourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    videoOrientation: "portrait",
    videoFocusY: 35,
  };
}

function state(overrides: Partial<DraftEditorState> = {}): DraftEditorState {
  return {
    step: 2,
    title: "최고의 보컬",
    category: "kpop",
    description: "설명",
    keywords: ["보컬", "라이브"],
    campaignSlug: "fall_2026",
    deadlineMs: 1_800_000_000_000,
    contestants: Array.from({ length: 48 }, (_, i) => fullContestant(i)),
    thumbnailPair: { a: 3, b: 17, aPos: 22, bPos: null, next: "a" },
    entryUnit: "individual",
    ...overrides,
  };
}

describe("toDraftFields → fromDraftDoc", () => {
  it("round-trips every field, all 48 slots and their video settings", () => {
    const s = state();
    const back = fromDraftDoc({ ...toDraftFields(s), hostUid: "u1", updatedAt: null });
    expect(back).toEqual(s);
  });

  it("drops undefined keys (Firestore rejects undefined)", () => {
    const s = state({
      contestants: [{ name: "A", nationality: "", affiliation: "", imageSearchKeyword: "", videoId: undefined }],
    });
    const fields = toDraftFields(s);
    expect("videoId" in (fields.contestants as Record<string, unknown>[])[0]).toBe(false);
  });

  it("writes only the known fields plus the schema version", () => {
    // ENTRY-UNIT-1: 엔트리 단위 칸은 팀일 때만 실린다 — 모든 칸이 보이게 팀 상태로 본다.
    const fields = toDraftFields(state({ entryUnit: "group" }));
    expect(Object.keys(fields).sort()).toEqual(
      [...DRAFT_FIELDS].filter((k) => k !== "hostUid" && k !== "updatedAt").sort(),
    );
    expect(fields.schemaVersion).toBe(DRAFT_SCHEMA_VERSION);
  });

  it("does not carry any admin-only assumption (no admin flag, owner is hostUid)", () => {
    expect(DRAFT_FIELDS).toContain("hostUid");
    expect(DRAFT_FIELDS.some((k) => /admin/i.test(k))).toBe(false);
  });

  it("returns null for a doc that is not a draft", () => {
    expect(fromDraftDoc(null)).toBeNull();
    expect(fromDraftDoc({ title: 3 })).toBeNull();
  });

  it("fills defaults for missing optional fields (older docs)", () => {
    const back = fromDraftDoc({ hostUid: "u1", title: "t" });
    expect(back).toMatchObject({ step: 1, title: "t", keywords: [], contestants: [] });
  });

  it("THUMB-1: 대표 매치가 없는 옛 초안 = 아무것도 안 고른 상태", () => {
    expect(fromDraftDoc({ hostUid: "u1" })?.thumbnailPair).toEqual(EMPTY_PICK);
  });

  it("THUMB-1: 대표 매치의 잘못된 값은 버린다(칸 0~47 · 위치 0~100)", () => {
    const back = fromDraftDoc({
      hostUid: "u1",
      thumbnailPair: { a: 99, b: 2, aPos: 500, bPos: "x", next: "z" },
    });
    expect(back?.thumbnailPair).toEqual({ a: null, b: 2, aPos: null, bPos: null, next: "a" });
  });
});

describe("isDraftBlank", () => {
  const blank: DraftEditorState = {
    thumbnailPair: EMPTY_PICK,
    step: 1,
    title: "",
    category: "",
    description: "",
    keywords: [],
    campaignSlug: "",
    deadlineMs: 1,
    contestants: [],
    entryUnit: "individual",
  };

  it("is blank when nothing was typed (step·deadline don't count)", () => {
    expect(isDraftBlank(blank)).toBe(true);
    expect(isDraftBlank({ ...blank, step: 2, deadlineMs: 99 })).toBe(true);
  });

  it("is blank when the grid only has empty slots", () => {
    expect(
      isDraftBlank({
        ...blank,
        contestants: [{ name: " ", nationality: "", affiliation: "", imageSearchKeyword: "" }],
      }),
    ).toBe(true);
  });

  it("is not blank once anything is typed", () => {
    expect(isDraftBlank({ ...blank, title: "a" })).toBe(false);
    expect(isDraftBlank({ ...blank, keywords: ["a"] })).toBe(false);
    expect(isDraftBlank({ ...blank, category: "kpop" })).toBe(false);
    expect(
      isDraftBlank({
        ...blank,
        contestants: [{ name: "", nationality: "", affiliation: "", imageSearchKeyword: "", videoId: "x" }],
      }),
    ).toBe(false);
  });
});

describe("ENTRY-UNIT-1 — 엔트리 단위도 초안에 저장·복원된다 (원장 D-73)", () => {
  it("팀으로 고른 초안은 팀으로 돌아온다", () => {
    const s = state({ entryUnit: "group" });
    const fields = toDraftFields(s);
    expect(fields.entryUnit).toBe("group");
    expect(fromDraftDoc({ ...fields, hostUid: "u1", updatedAt: null })?.entryUnit).toBe("group");
  });

  it("개인(기본값)은 칸을 빼고 저장한다 — 규칙 배포 전에도 개인 초안 저장이 막히지 않게", () => {
    const fields = toDraftFields(state());
    expect("entryUnit" in fields).toBe(false);
    expect(fromDraftDoc({ ...fields, hostUid: "u1", updatedAt: null })).toEqual(state());
  });

  it("단위 칸이 없는 옛 초안 · 모르는 값은 개인으로 읽는다", () => {
    expect(fromDraftDoc({ hostUid: "u1" })?.entryUnit).toBe("individual");
    expect(fromDraftDoc({ hostUid: "u1", entryUnit: "team" })?.entryUnit).toBe("individual");
  });

  it("단위를 팀으로만 바꿔도 빈 초안이 아니다 (기본값 개인은 세지 않는다)", () => {
    const blank = state({
      step: 1,
      title: "",
      category: "",
      description: "",
      keywords: [],
      campaignSlug: "",
      contestants: [],
    });
    expect(isDraftBlank(blank)).toBe(true);
    expect(isDraftBlank({ ...blank, entryUnit: "group" })).toBe(false);
  });
});

describe("phaseAfterDraftList — 목록이 늦게 와도 편집 중인 화면을 빼앗지 않는다", () => {
  it("decides only while still loading", () => {
    expect(phaseAfterDraftList("loading", 2)).toBe("choose");
    expect(phaseAfterDraftList("loading", 0)).toBe("edit");
  });

  it("keeps the editor when the host already pressed 새로 시작 during loading", () => {
    // CI 실측(2026-10-17): 목록이 ~2초 늦게 와서 쓰던 편집기가 목록으로 되돌아갔다.
    expect(phaseAfterDraftList("edit", 3)).toBe("edit");
    expect(phaseAfterDraftList("choose", 0)).toBe("choose");
  });
});

describe("sortDraftsByUpdated", () => {
  it("puts the most recently saved first", () => {
    const list = [
      { id: "a", updatedAtMs: 1 },
      { id: "b", updatedAtMs: 3 },
      { id: "c", updatedAtMs: 2 },
    ];
    expect(sortDraftsByUpdated(list).map((d) => d.id)).toEqual(["b", "c", "a"]);
  });
});

/**
 * Firestore 문서 크기 셈법(공식 문서 "Storage size calculations"):
 * 문자열 = UTF-8 바이트 + 1 · 숫자 8 · 불 1 · null 1 · 타임스탬프 8 · 맵/배열 = 칸 합
 * · 필드 이름 = UTF-8 바이트 + 1 · 문서 = 이름 크기 + 칸 합 + 32.
 */
function fsSize(v: unknown): number {
  if (v === null || typeof v === "boolean") return 1;
  if (typeof v === "number") return 8;
  if (typeof v === "string") return Buffer.byteLength(v, "utf8") + 1;
  if (Array.isArray(v)) return v.reduce<number>((n, x) => n + fsSize(x), 0);
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>).reduce(
      (n, [k, x]) => n + Buffer.byteLength(k, "utf8") + 1 + fsSize(x),
      0,
    );
  }
  return 0;
}

describe("문서 크기 — 48칸이 1MB 한도 안에 든다", () => {
  it("worst case (규칙 상한까지 꽉 채움) stays far below 1 MiB", () => {
    const longKo = (n: number) => "가".repeat(n); // 한글 = 3바이트
    const worst = state({
      title: longKo(200),
      description: longKo(2000),
      keywords: Array.from({ length: 30 }, () => longKo(100)),
      campaignSlug: "x".repeat(100),
      category: "x".repeat(100),
      contestants: Array.from({ length: 48 }, () => ({
        name: longKo(200),
        nationality: "KR",
        affiliation: longKo(200),
        imageSearchKeyword: longKo(200),
        videoId: "dQw4w9WgXcQ",
        videoStartSec: 1,
        videoEndSec: 2,
        videoSourceUrl: "https://www.youtube.com/watch?v=" + "x".repeat(200),
        videoOrientation: "portrait" as const,
        videoFocusY: 40,
      })),
    });
    const docName = "projects/p/databases/(default)/documents/tournamentDrafts/" + "x".repeat(20);
    const bytes =
      Buffer.byteLength(docName) + 1 +
      fsSize({ ...toDraftFields(worst), hostUid: "x".repeat(28), updatedAt: 0 }) + 32;
    // 보고용 숫자 — 셈이 바뀌면 여기서 드러난다.
    console.info(`[EDITOR-FIX-1] worst-case draft doc ≈ ${bytes} bytes`);
    expect(bytes).toBeLessThan(1_048_576 / 4);
  });

  it("realistic full draft (48칸 + 영상) is a few tens of KB", () => {
    const bytes = fsSize({ ...toDraftFields(state()), hostUid: "x".repeat(28), updatedAt: 0 });
    console.info(`[EDITOR-FIX-1] realistic 48-slot draft ≈ ${bytes} bytes`);
    expect(bytes).toBeLessThan(64 * 1024);
  });
});
