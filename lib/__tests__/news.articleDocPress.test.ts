/**
 * PRESS-1 PR 1 · 3-1 — 외신 종합 기사 칸 (분야 · 출처 목록 · 사진 · 사진 키워드 · 다시 쓰기).
 * 옛 기사(칸 없음)는 그대로 통과하고, 새 출처 cron_press 도 초안만 만든다.
 */
import { describe, expect, it } from "vitest";
import {
  ARTICLE_ORIGINS,
  ARTICLE_CATEGORIES,
  PRESS_PHOTO_KEYWORDS,
  PRESS_REWRITE_MAX,
  buildLocalizedArticleDraft,
  canTransition,
  isDraftOnlyOrigin,
  isValidArticlePhoto,
  normalizePhotoKeyword,
  type LocalizedArticleDraftInput,
  type PressFields,
} from "../news/articleDoc";

const press = (over: Partial<PressFields> = {}): PressFields => ({
  category: "kpop",
  sources: [{ outlet: "Billboard", title: "Hot 100", url: "https://www.billboard.com/a", readAt: "2026-11-27" }],
  photoKeyword: "chart",
  ...over,
});

const input = (over: Partial<LocalizedArticleDraftInput> = {}): LocalizedArticleDraftInput => ({
  slug: "20261127-a1b2c3",
  template: "column",
  origin: "cron_press",
  sourceLang: "ko",
  title: { ko: "제목", en: "Title", es: "Título" },
  subhead: { ko: "부제", en: "Sub", es: "Sub" },
  body: {
    ko: [{ type: "lead", text: "리드" }],
    en: [{ type: "lead", text: "lead" }],
    es: [{ type: "lead", text: "entrada" }],
  },
  evidence: { asOf: "2026-11-27 06:40 KST", stats: [] },
  press: press(),
  ...over,
});

describe("상수", () => {
  it("새 출처 cron_press 가 끝에 더해지고 옛 5개는 그대로", () => {
    expect(ARTICLE_ORIGINS).toEqual(["event_open", "event_champion", "cron_weekly", "manual_ai", "manual_blank", "cron_press"]);
  });
  it("분야 = kpop · creator", () => {
    expect(ARTICLE_CATEGORIES).toEqual(["kpop", "creator"]);
  });
  it("키워드 목록(지시서 3-4 · 킥 v0.2 결정 2)", () => {
    expect(PRESS_PHOTO_KEYWORDS.kpop).toEqual([
      "default", "comeback", "chart", "reverse-run", "debut", "stage", "broadcast", "award", "concert", "fandom", "challenge",
    ]);
    expect(PRESS_PHOTO_KEYWORDS.creator).toEqual([
      "default", "record", "collab", "youtube", "sns", "cover", "revenue", "business", "event", "challenge",
    ]);
  });
  it("다시 쓰기 상한 = 2", () => {
    expect(PRESS_REWRITE_MAX).toBe(2);
  });
});

describe("normalizePhotoKeyword", () => {
  it("목록 안은 그대로 · 대소문자 · 공백 정리", () => {
    expect(normalizePhotoKeyword("kpop", "chart")).toBe("chart");
    expect(normalizePhotoKeyword("creator", " Collab ")).toBe("collab");
  });
  it("목록 밖 · 다른 분야의 키워드 · 빈 값 → default", () => {
    expect(normalizePhotoKeyword("kpop", "scandal")).toBe("default");
    expect(normalizePhotoKeyword("kpop", "record")).toBe("default");
    expect(normalizePhotoKeyword("creator", "")).toBe("default");
    expect(normalizePhotoKeyword("creator", 42)).toBe("default");
  });
});

describe("isValidArticlePhoto", () => {
  const photo = {
    url: "https://firebasestorage.googleapis.com/v0/b/x/o/news-photos%2Fa.jpg",
    author: "Jane",
    licenseName: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
    sourcePageUrl: "https://www.flickr.com/photos/jane/123",
    isDefault: false,
  };
  it("모든 칸이 있으면 참", () => {
    expect(isValidArticlePhoto(photo)).toBe(true);
  });
  it("주소가 http(s) 가 아니거나 isDefault 가 참/거짓이 아니면 거짓", () => {
    expect(isValidArticlePhoto({ ...photo, url: "javascript:alert(1)" })).toBe(false);
    expect(isValidArticlePhoto({ ...photo, isDefault: "no" })).toBe(false);
    expect(isValidArticlePhoto(null)).toBe(false);
  });
  it("작가가 없는 라이선스(CC0 · 퍼블릭 도메인)는 작가 빈 글자 허용", () => {
    expect(isValidArticlePhoto({ ...photo, author: "", licenseName: "CC0" })).toBe(true);
  });
});

describe("buildLocalizedArticleDraft — 외신 종합", () => {
  it("press 칸이 실리고 여전히 초안(자동 발행 없음)", () => {
    const doc = buildLocalizedArticleDraft(input());
    expect(doc.status).toBe("draft");
    expect(doc.publishedAt).toBeNull();
    expect(doc.origin).toBe("cron_press");
    expect(doc.category).toBe("kpop");
    expect(doc.sources).toEqual(press().sources);
    expect(doc.photoKeyword).toBe("chart");
    expect(doc.rewriteCount).toBe(0);
    expect(doc).not.toHaveProperty("photo");
    expect(doc).not.toHaveProperty("rewriteOf");
  });

  it("다시 쓰기 칸(rewriteOf · rewriteNote · rewriteCount)을 그대로 싣는다", () => {
    const doc = buildLocalizedArticleDraft(
      input({ press: press({ rewriteCount: 1, rewriteOf: "20261127-zzzzzz", rewriteNote: "첫 줄을 더 짧게" }) }),
    );
    expect(doc.rewriteCount).toBe(1);
    expect(doc.rewriteOf).toBe("20261127-zzzzzz");
    expect(doc.rewriteNote).toBe("첫 줄을 더 짧게");
  });

  it("목록 밖 키워드는 default 로 저장", () => {
    expect(buildLocalizedArticleDraft(input({ press: press({ photoKeyword: "gossip" }) })).photoKeyword).toBe("default");
  });

  it("다시 쓰기 횟수 0~2 밖 · 정수 아님 → 거절", () => {
    for (const n of [-1, 3, 1.5]) {
      expect(() => buildLocalizedArticleDraft(input({ press: press({ rewriteCount: n }) }))).toThrow();
    }
  });

  it("분야가 목록 밖이면 거절", () => {
    expect(() => buildLocalizedArticleDraft(input({ press: press({ category: "drama" as never }) }))).toThrow();
  });

  it("출처 한 줄이라도 모양이 틀리면 거절(주소 http(s) · 매체 · 제목 · 날짜)", () => {
    const bad = [
      { outlet: "", title: "t", url: "https://a.com", readAt: "2026-11-27" },
      { outlet: "o", title: "t", url: "ftp://a.com", readAt: "2026-11-27" },
      { outlet: "o", title: "t", url: "https://a.com", readAt: "어제" },
    ];
    for (const s of bad) {
      expect(() => buildLocalizedArticleDraft(input({ press: press({ sources: [s] }) }))).toThrow();
    }
  });

  it("cron_press 인데 press 칸이 없으면 거절 · 다른 출처에 press 칸이 오면 거절", () => {
    expect(() => buildLocalizedArticleDraft(input({ press: undefined }))).toThrow();
    expect(() => buildLocalizedArticleDraft(input({ origin: "cron_weekly", template: "weekly" }))).toThrow();
  });

  it("옛 기사(press 없음)는 새 칸 없이 그대로", () => {
    const doc = buildLocalizedArticleDraft(input({ origin: "manual_ai", press: undefined }));
    for (const k of ["category", "sources", "photo", "photoKeyword", "rewriteCount", "rewriteOf", "rewriteNote"]) {
      expect(doc).not.toHaveProperty(k);
    }
  });
});

describe("초안 전용 · 버리기 이동", () => {
  it("cron_press 도 초안 전용", () => {
    expect(isDraftOnlyOrigin("cron_press")).toBe(true);
  });
  it("초안 → 보관(버리기)이 허용된다", () => {
    expect(canTransition("draft", "archived")).toBe(true);
  });
});
