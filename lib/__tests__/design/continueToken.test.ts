/**
 * "이어서 하기" 알약 토큰 정리 (2026-11-07 · 원장 D-76 · 디자인 시스템 v5 맞추기).
 *
 * 잡으려는 사고: 화면의 "이어서 하기" 알약은 청록(#00A3B7)인데 무대 토큰 `--arena-continue-bg` 는
 * 옛 노랑(#FCD006)으로 남아 있었고, 알약은 그 토큰을 읽지 않았다. 그 노랑 토큰을 아레나 홈
 * "랭킹 보기" 버튼이 빌려 쓰고 있어서, 토큰만 고치면 버튼이 청록으로 바뀐다.
 * 정해진 모양: 토큰 = 청록(--color-turquoise 와 같은 값) · 알약은 이 토큰을 읽는다 ·
 * "랭킹 보기"는 Crown Gold(--color-gold)를 직접 읽는다 — 화면 색은 그대로.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(ROOT, p), "utf8");

function tokenHex(css: string, name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!m) throw new Error(`token ${name} not found`);
  return m[1].toUpperCase();
}

/** 선택자 하나의 규칙 덩어리(첫 번째) */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`rule ${selector} not found`);
  return css.slice(start, css.indexOf("}", start));
}

describe("이어서 하기 알약 토큰 = 청록", () => {
  const stage = read("app/arena_stage_tokens.css");
  const globals = read("app/globals.css");

  it("--arena-continue-bg 는 청록(--color-turquoise 와 같은 값)이다", () => {
    expect(tokenHex(stage, "--arena-continue-bg")).toBe(tokenHex(globals, "--color-turquoise"));
  });

  it("이어서 하기 알약은 --arena-continue-bg 를 읽는다", () => {
    expect(rule(read("components/layout/navbar.css"), ".wc-pill")).toMatch(/background:\s*var\(--arena-continue-bg\)/);
  });

  it("아레나 홈 \"랭킹 보기\"는 Crown Gold 를 직접 읽는다 (알약 토큰을 빌리지 않는다)", () => {
    const btn = rule(read("components/arenaHome/arenaHome.module.css"), ".rankBtn");
    expect(btn).toMatch(/background:\s*var\(--color-gold\)/);
    expect(btn).not.toMatch(/--arena-continue-bg/);
  });

  it("프로필 알약은 무대 알약 글자 토큰을 쓰지 않는다", () => {
    expect(read("components/auth/UserAvatar.tsx")).not.toMatch(/--arena-continue-text/);
  });
});
