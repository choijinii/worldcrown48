/**
 * 사전등록 페이지 눈검사 고침 (PRE-REG-1 · 원장 D-60 · 대표 2026-10-18 22:53).
 *
 * ① 슬로건 위 눈썹 줄 삭제 ② 맨 아래 배너 = 누르지 않는 글자 배너(문구 교체 · → 없음)
 * ③ 등록 안내 글 150% · 그림과의 간격 줄임 ④ 보관 기간 줄 아래 삭제 요청 메일 줄(처리방침 연락
 * 주소와 같아야 한다) ⑤ SNS 는 X 하나(https://x.com/worldcrown48) — Instagram·TikTok 계정 없음.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";
import { DELETION_REQUEST_EMAIL } from "@/lib/launch/retentionNote";

const ROOT = path.resolve(__dirname, "../../..");
const src = (p: string) => readFileSync(path.join(ROOT, p), "utf8");
const LANGS = ["ko", "en", "es"] as const;
const BENEFIT_LEAK = /\b200\b|배지|badge|insignia|The Lab|\d{1,2}\/\d{1,2}|20\d\d/i;

describe("① 슬로건 위 눈썹 줄 삭제", () => {
  it("LaunchHero 에 kicker 가 없고 문구 키도 없다", () => {
    expect(src("components/launch/LaunchHero.tsx")).not.toMatch(/hero-kicker|launch\.hero\.kicker/);
    expect("launch.hero.kicker" in MESSAGES).toBe(false);
  });
});

describe("② 맨 아래 배너 글자", () => {
  it.each(LANGS)("%s — 문구가 있고 혜택 숫자·낱말·날짜가 없다", (lang) => {
    const text = MESSAGES["banner.launch.title"][lang];
    expect(text.trim().length).toBeGreaterThan(0);
    expect(text).not.toMatch(BENEFIT_LEAK);
  });

  it("3언어 = 승인 문안 그대로(대표 2026-10-19 · en·es 뒤 문장 = 10/09 X 안내 글)", () => {
    expect(MESSAGES["banner.launch.title"]).toEqual({
      ko: "사전등록에 참가하세요! 먼저 온 사람에게 혜택이 기다립니다.",
      en: "Join the Waitlist! Something special awaits those who come first.",
      es: "¡Únete a la lista! Algo especial espera a quienes lleguen primero.",
    });
  });

  it("BannerSlot 은 글자 배너(text)를 링크·버튼·화살표 없이 그린다", () => {
    const s = src("components/layout/BannerSlot.tsx");
    const at = s.indexOf('notice.action === "text"');
    expect(at).toBeGreaterThan(-1);
    const block = s.slice(at, s.indexOf(")", s.indexOf("</div>", at)));
    expect(block).not.toMatch(/<Link|<button|→/);
  });
});

describe("③ 등록 안내 글 150% · 그림 쪽으로", () => {
  const css = src("app/globals.css");
  const rule = (sel: string) => css.slice(css.indexOf(`${sel} {`), css.indexOf("}", css.indexOf(`${sel} {`)));
  it("wl-head 글자 15px → 22.5px", () => {
    expect(rule(".wl-head")).toMatch(/font-size:\s*22\.5px/);
  });
  it("waitlist 위 간격 64px(space-16) → 40px(space-10)", () => {
    expect(rule(".waitlist")).toMatch(/margin:\s*var\(--space-10\) auto 0/);
  });
});

describe("④ 삭제 요청 메일 줄", () => {
  it("주소 = 처리방침 연락 주소(정책·법적 문의) — 3언어 모두", () => {
    for (const lang of LANGS) {
      const md = src(`content/${lang}/privacy.md`);
      const row = md.split("\n").find((l) => l.startsWith("|") && /mailto:policy@/.test(l) && /정책·법적|Policy · legal|políticas/.test(l));
      expect(row, `${lang} 연락처 표`).toBeTruthy();
      expect(row).toContain(`mailto:${DELETION_REQUEST_EMAIL}`);
    }
    expect(DELETION_REQUEST_EMAIL).toBe("policy@worldcrown48.com");
  });

  it.each(LANGS)("%s — 문구에 주소가 그대로 들어 있다", (lang) => {
    expect(MESSAGES["launch.waitlist.deletion"][lang]).toContain(DELETION_REQUEST_EMAIL);
  });

  it("ko = 대표 문안 그대로", () => {
    expect(MESSAGES["launch.waitlist.deletion"].ko).toBe("삭제 요청: policy@worldcrown48.com");
  });

  it("보관 기간 줄 바로 아래 · 주소는 mailto 링크", () => {
    const s = src("components/launch/WaitlistForm.tsx");
    const retention = s.indexOf('<p className="wl-retention">');
    const deletion = s.indexOf('<p className="wl-deletion">');
    expect(retention).toBeGreaterThan(-1);
    expect(deletion).toBeGreaterThan(retention);
    expect(s).toContain("href={`mailto:${DELETION_REQUEST_EMAIL}`}");
  });
});

describe("작은 글씨 세 줄 — 낱말 가운데서 끊지 않는다(390 · 대표 승인 2026-10-19)", () => {
  it("wl-privacy · wl-retention · wl-deletion 에 word-break: keep-all", () => {
    const css = src("app/globals.css");
    const at = css.indexOf(".wl-privacy,\n.wl-retention,\n.wl-deletion {");
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at))).toMatch(/word-break:\s*keep-all/);
  });
});

describe("⑤ SNS = X 하나", () => {
  it("X 링크만 · https://x.com/worldcrown48", () => {
    const s = src("components/launch/SNSLinks.tsx");
    expect(s).not.toMatch(/instagram\.com|tiktok\.com|"instagram"|"tiktok"/i);
    expect(s).toContain('"https://x.com/worldcrown48"');
    expect(s).not.toContain("twitter.com");
  });
});
