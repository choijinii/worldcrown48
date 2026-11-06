/**
 * 로그인 뒤 프로필 알약 색 (2026-11-04 대표 · 원장 D-76).
 *
 * 잡으려는 사고: 알약 바탕이 메뉴바와 거의 같은 반투명 흰색이고 이름 글자는 밝은 지면용
 * 진한 남색이라, 다크 메뉴바 위에서 이름이 읽히지 않았다(대비 약 1.1).
 * 정해진 모양: 바탕 = Aura Yellow(--color-aura) · 글자 = 진한 남색(--arena-continue-text) ·
 * 대비 4.5 이상. 로그인 전 "로그인" 알약(진한 노랑)과 사진 알약은 이 테스트 밖이다.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

function tokenHex(css: string, name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} not found`);
  return m[1];
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 프로필 알약 단추(data-testid="user-avatar")의 인라인 style 덩어리 */
function avatarButtonStyle(src: string): string {
  const start = src.indexOf('data-testid="user-avatar"');
  const end = src.indexOf("<AvatarPill", start);
  return src.slice(start, end);
}

/** 이름 글자 span 의 style 덩어리 */
function nameStyle(src: string): string {
  const start = src.indexOf("<AvatarPill user={user} />");
  return src.slice(start, src.indexOf("{display}", start));
}

describe("로그인 뒤 프로필 알약 = 연한 노랑 바탕 + 진한 글자", () => {
  const src = read("components/auth/UserAvatar.tsx");

  it("알약 바탕은 Aura Yellow 토큰이다", () => {
    expect(avatarButtonStyle(src)).toMatch(/background:\s*"var\(--color-aura\)"/);
  });

  it("이름 글자는 진한 남색 토큰이다", () => {
    expect(nameStyle(src)).toMatch(/color:\s*"var\(--arena-continue-text\)"/);
  });

  it("두 토큰의 글자 대비가 4.5 이상이다", () => {
    const aura = tokenHex(read("app/globals.css"), "--color-aura");
    const ink = tokenHex(read("app/arena_stage_tokens.css"), "--arena-continue-text");
    expect(contrast(aura, ink)).toBeGreaterThanOrEqual(4.5);
  });
});
