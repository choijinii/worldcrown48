/**
 * COOKIE-1 Phase C — 동의 바 문구 불변(R1) + 한 줄 재배치 구조.
 *
 * 문구 스냅샷은 재배치 **전** 코드에 대고 먼저 green 으로 만들었다. 재배치 뒤에도 같은
 * 글자가 DOM 에 그대로 있어야 한다 — 접힌 머리말·본문도 포함(접기는 숨김이지 삭제가 아니다).
 * 허용 예외는 '자세히' 단추 하나(대표 승인).
 */
import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CookieBanner } from "@/components/policy/CookieBanner";

vi.mock("@/components/policy/CookieConsentProvider", () => ({
  useCookieConsent: () => ({
    bannerState: "visible",
    acceptAll: async () => {},
    rejectAll: async () => {},
    openModal: () => {},
  }),
}));

const html = renderToStaticMarkup(createElement(CookieBanner));

/** 태그를 걷어내고 공백을 하나로 — 줄바꿈 위치가 바뀌어도 글자는 같아야 한다. */
function text(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** class 이름으로 요소 하나의 바깥 HTML 을 꺼낸다(중첩 없는 단순 요소 전용). */
function byClass(cls: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>[\\s\\S]*?</${tag}>`);
  const m = html.match(re);
  if (!m) throw new Error(`.${cls} <${tag}> not found`);
  return m[0];
}

const EYEBROW = "쿠키 동의 · COOKIE CONSENT · GDPR";
const TITLE = "데이터를 정중하게 다루기 위한 동의가 필요합니다.";
const BODY_KO =
  "WC48은 서비스 제공에 필요한 필수 쿠키를 사용하며, 기능·분석·광고 쿠키는 모두 선택사항입니다. " +
  "카테고리별로 동의를 변경할 수 있습니다. 자세한 내용은 쿠키 정책 · 개인정보처리방침 을 참고하세요.";
const BODY_EN =
  "We use essential cookies to run the service. Functional, analytics, and marketing cookies are all " +
  "optional — set each category individually. See our Cookie Policy · Privacy Policy .";
const BUTTONS = ["필수만 · Reject non-essential", "설정하기 · Customize", "모두 허용 · Accept all"];

describe("동의 바 문구 불변 (R1)", () => {
  it("머리말 줄", () => {
    expect(text(byClass("cb-eyebrow", "div"))).toBe(EYEBROW);
  });

  it("제목", () => {
    expect(text(byClass("cb-title", "h2"))).toBe(TITLE);
  });

  it("본문 ko + en", () => {
    const body = text(byClass("cb-body", "p"));
    expect(body).toBe(`${BODY_KO} ${BODY_EN}`);
    expect(text(byClass("cb-body-en", "span"))).toBe(BODY_EN);
  });

  it("버튼 3개 — 순서 그대로", () => {
    const labels = Array.from(html.matchAll(/<button[^>]*class="(btn-[a-z]+)"[^>]*>([\s\S]*?)<\/button>/g)).map(
      (m) => text(m[2]),
    );
    expect(labels).toEqual(BUTTONS);
  });

  it("정책 링크 두 개씩(ko · en) 그대로", () => {
    expect(html.match(/href="\/policies\/cookies"/g)?.length).toBe(2);
    expect(html.match(/href="\/policies\/privacy"/g)?.length).toBe(2);
  });
});

describe("동의 바 한 줄 구조 (§9 게이트 1)", () => {
  /** id="…" 인 요소부터 그 요소가 닫히는 곳까지(같은 태그 중첩을 센다). */
  function elementById(id: string): string {
    const open = html.match(new RegExp(`<([a-z0-9]+)[^>]*\\bid="${id}"[^>]*>`));
    if (!open || open.index === undefined) throw new Error(`#${id} not found`);
    const tag = open[1];
    const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "g");
    re.lastIndex = open.index;
    let depth = 0;
    for (let m = re.exec(html); m; m = re.exec(html)) {
      depth += m[0].startsWith("</") ? -1 : 1;
      if (depth === 0) return html.slice(open.index, m.index + m[0].length);
    }
    throw new Error(`#${id} not closed`);
  }

  const more = html.match(/<button[^>]*class="cb-more"[^>]*>/)?.[0] ?? "";
  const controls = more.match(/aria-controls="([^"]+)"/)?.[1] ?? "";

  it("'자세히' 단추가 있고 처음엔 접혀 있다", () => {
    expect(more).not.toBe("");
    expect(more).toContain('aria-expanded="false"');
    expect(controls).not.toBe("");
  });

  it("'자세히' 단추 글자 = 대표 승인 문구 (2026-10-05) — 새로 생긴 글자는 이것 하나", () => {
    const label = html.match(/<button[^>]*class="cb-more"[^>]*>([\s\S]*?)<\/button>/)?.[1] ?? "";
    expect(text(label)).toBe("자세히 · Details");
  });

  it("머리말 줄과 본문(ko·en)은 접힌 영역 안에 있고 DOM 에 남아 있다", () => {
    const details = elementById(controls);
    expect(details).toMatch(/^<div[^>]*\bhidden=""/);
    expect(details).toContain('class="cb-eyebrow"');
    expect(details).toContain('class="cb-body"');
    expect(text(details)).toContain(EYEBROW);
    expect(text(details)).toContain(BODY_EN);
  });

  it("제목과 버튼 3개는 접힌 영역 밖(한 줄)에 있다", () => {
    const details = elementById(controls);
    expect(details).not.toContain("cb-title");
    expect(details).not.toContain("<button");
    const row = html.slice(html.indexOf('class="cb-row"'));
    expect(row).toContain("cb-title");
    for (const b of BUTTONS) expect(text(row)).toContain(b);
  });
});
