/**
 * ANON-1 (2026-10-04 대표 결정 · 제안 1) — 익명 계정은 정해진 세 곳에서만 만든다.
 *
 * 잡으려는 사고: 사이트 전체를 감싸는 쿠키 동의 부품이 페이지를 열 때마다 익명 계정을
 * 만들어, 오픈 전인데 검색 로봇·자동 테스트 브라우저마다 계정이 쌓였다(약 700, SEO-1 조사).
 *
 * 허용된 곳: ① 쿠키 동의 저장(CookieConsentProvider 의 저장 경로) ② 아레나 입장
 * ③ 크라운 카드(챔피언) 입장 — ②③은 useGuestUidOnEntry 훅 하나로 들어간다.
 * 그 밖의 파일이 ensureAnonymousUid 를 부르면 이 테스트가 빨개진다.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { planConsentBoot } from "@/lib/cookieConsentBoot";

const ROOT = path.resolve(__dirname, "../../..");
const SCAN_DIRS = ["app", "components", "lib"];
const ALLOWED = new Set([
  "lib/firebase.ts", // 정의
  "lib/auth/useGuestUidOnEntry.ts", // 아레나·챔피언 입장
  "components/policy/CookieConsentProvider.tsx", // 동의 저장
]);

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name.startsWith(".")) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
}

describe("ANON-1 익명 계정을 만드는 자리", () => {
  it("ensureAnonymousUid 를 쓰는 파일은 허용된 세 곳뿐이다", () => {
    const files: string[] = [];
    for (const d of SCAN_DIRS) walk(path.join(ROOT, d), files);
    const users = files
      .filter((f) => readFileSync(f, "utf8").includes("ensureAnonymousUid"))
      .map((f) => path.relative(ROOT, f).split(path.sep).join("/"));
    expect(users.sort()).toEqual(Array.from(ALLOWED).sort());
  });

  it("아레나·챔피언 페이지는 입장 훅을 쓴다", () => {
    for (const p of ["app/arena/[tournamentId]/page.tsx", "app/arena/[tournamentId]/champion/page.tsx"]) {
      expect(readFileSync(path.join(ROOT, p), "utf8")).toContain("useGuestUidOnEntry()");
    }
  });

  it("쿠키 동의 부품의 첫 화면 경로는 계정을 만들지 않는다 (ensureAnonymousUid 는 저장 경로에만)", () => {
    const src = readFileSync(path.join(ROOT, "components/policy/CookieConsentProvider.tsx"), "utf8");
    const boot = src.slice(src.indexOf("// ── Boot:"), src.indexOf("// ── Persist helper"));
    const persist = src.slice(src.indexOf("// ── Persist helper"), src.indexOf("// ── Banner actions"));
    expect(boot.length).toBeGreaterThan(0);
    expect(boot).not.toContain("ensureAnonymousUid");
    expect(boot).toContain("getExistingUser");
    expect(persist).toContain("ensureAnonymousUid");
  });
});

describe("ANON-1 planConsentBoot", () => {
  const day = new Date("2026-10-04T00:00:00Z");
  it("이미 동의한 흔적이 있으면 아무것도 읽지 않고 숨긴다", () => {
    expect(planConsentBoot({ cookieSavedAt: day, existingUid: null })).toBe("hide-by-cookie");
    expect(planConsentBoot({ cookieSavedAt: day, existingUid: "u1" })).toBe("hide-by-cookie");
  });
  it("흔적이 없고 기존 사용자가 있으면 그 사용자의 동의 기록을 확인한다", () => {
    expect(planConsentBoot({ cookieSavedAt: null, existingUid: "u1" })).toBe("check-firestore");
  });
  it("흔적도 사용자도 없으면(첫 방문) 계정을 만들지 않고 동의 바를 보여 준다", () => {
    expect(planConsentBoot({ cookieSavedAt: null, existingUid: null })).toBe("show-banner");
  });
});
