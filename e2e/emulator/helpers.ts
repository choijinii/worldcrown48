/**
 * 에뮬레이터 E2E 공용 (IMAGE-1 PR 1).
 *
 * firebase emulators:exec 가 FIRESTORE_EMULATOR_HOST · FIREBASE_AUTH_EMULATOR_HOST ·
 * FIREBASE_STORAGE_EMULATOR_HOST 를 채워 준다 — admin SDK 는 그 값을 보고 에뮬레이터만 부른다.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as admin from "firebase-admin";
import { expect, type Page } from "@playwright/test";

export const PROJECT_ID = "demo-wc48";
export const BUCKET = "demo-wc48.appspot.com";
export const ADMIN_UID = process.env.E2E_ADMIN_UID ?? "e2e-admin";
export const FIXTURES = join(__dirname, "..", "fixtures", "entry-images");
export const fixture = (name: string) => join(FIXTURES, name);
export const FIXTURE_48 = Array.from({ length: 48 }, (_, i) => fixture(`${String(i + 1).padStart(2, "0")}.jpg`));

export function adminApp(): admin.app.App {
  if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
  return admin.app();
}
export const db = () => adminApp().firestore();

/** 에뮬레이터 전체 비우기(시험 사이 독립). */
export async function resetEmulators(): Promise<void> {
  const fs = process.env.FIRESTORE_EMULATOR_HOST;
  if (fs) await fetch(`http://${fs}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
  const [files] = await adminApp().storage().bucket().getFiles().catch(() => [[]] as never);
  await Promise.all((files as { delete: () => Promise<unknown> }[]).map((f) => f.delete().catch(() => undefined)));
}

/** 편집기 1단계에 필요한 카테고리 하나(K-POP · live). */
export async function seedCategories(): Promise<void> {
  await db().collection("categories").doc("KPOP").set({
    name: { ko: "K-POP", en: "K-POP", es: "K-POP" },
    status: "live",
    phase: 1,
    order: 1,
  });
}

/** 콘솔 오류를 모은다 — 끝에 `expect(errors).toHaveLength(0)`. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

/** 관리자(e2e-admin)로 로그인 — 앱의 에뮬레이터 전용 손잡이(lib/firebase.ts)로 토큰을 넣는다. */
export async function signInAsAdmin(page: Page): Promise<void> {
  // 실서비스 운영자 계정처럼 관리자 표시(admin: true)를 단다 — storage.rules 그림 쓰기 조건(D-77 보충).
  const token = await adminApp().auth().createCustomToken(ADMIN_UID, { admin: true });
  await page.waitForFunction(() => typeof (window as unknown as { __wc48SignIn?: unknown }).__wc48SignIn === "function");
  await page.evaluate(async (t) => {
    await (window as unknown as { __wc48SignIn: (x: string) => Promise<unknown> }).__wc48SignIn(t);
  }, token);
}

/** 쿠키 동의 바가 아래를 덮지 않게 동의 흔적을 미리 둔다(필수만). */
export async function dismissConsent(page: Page): Promise<void> {
  await page.getByTestId("consent-bar-reject").or(page.getByTestId("consent-reject")).first().click({ timeout: 3000 }).catch(() => undefined);
}

/** 바깥 사이트 대신 쓰는 로컬 가짜 그림 서버. */
export async function startFakeImageServer(): Promise<{ base: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    const url = req.url ?? "";
    if (url.startsWith("/img/")) {
      const name = url.slice(5).split("?")[0];
      try {
        const body = readFileSync(fixture(name));
        res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Length": body.length });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end();
      }
    } else if (url.startsWith("/page.html")) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><body>not an image</body></html>");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    base,
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
}

/** 편집기 AI 콜러블(번역 · 이름 3언어)은 이 판에서 부르지 않는다 — 원문 그대로 돌려준다. */
export async function stubAiCallables(page: Page): Promise<void> {
  await page.route(/\/translateTournamentMeta$/, async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}") as { data?: { title?: string; description?: string } };
    const t = body.data?.title ?? "";
    const d = body.data?.description ?? "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ result: { titleI18n: { ko: t, en: t, es: t }, descriptionI18n: { ko: d, en: d, es: d } } }),
    });
  });
  await page.route(/\/translateContestantNames$/, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ result: { names: [] } }) }),
  );
}

export async function expectNoConsoleErrors(errors: string[]): Promise<void> {
  expect(errors, errors.join("\n")).toHaveLength(0);
}

// ── 시드 ──────────────────────────────────────────────────────────────────────

export const DRAFT_TITLE = "IMAGE-1 시험 대회";
export const MISMATCH_SLOT = 10;

/**
 * STEP 2 에 바로 들어가는 초안 — 48칸 이름.
 * 대회 종류(원장 D-90): "video"(기본) = 영상 대회 · 10번 칸만 영상(제목·채널이 이름과 다름 → 불일치) ·
 * "image" = 이미지 대회 · 영상 없음. `storeKind: false` 면 종류 칸 없이 심는다(옛 초안 — 칸에서 추론).
 */
export async function seedDraft(
  id = "e2eDraft1",
  kind: "video" | "image" = "video",
  { storeKind = true }: { storeKind?: boolean } = {},
): Promise<string> {
  const contestants = Array.from({ length: 48 }, (_, i) => ({
    name: `엔트리${String(i + 1).padStart(2, "0")}`,
    nationality: "KR",
    affiliation: `그룹${i + 1}`,
    imageSearchKeyword: "",
    ...(kind === "video" && i === MISMATCH_SLOT
      ? { videoId: "dQw4w9WgXcQ", videoStartSec: 0, videoEndSec: 15, videoSourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoTitle: "Other MV", videoChannel: "Other Channel" }
      : {}),
  }));
  await db().collection("tournamentDrafts").doc(id).set({
    hostUid: ADMIN_UID,
    schemaVersion: 1,
    step: 2,
    title: DRAFT_TITLE,
    category: "KPOP",
    description: "",
    keywords: ["시험"],
    campaignSlug: "",
    deadlineMs: Date.now() + 7 * 86_400_000,
    contestants,
    ...(storeKind ? { mediaKind: kind } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return id;
}

export const storageUrl = (path: string) =>
  `http://127.0.0.1:9199/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;

/**
 * 발행된 그림 대회(엔트리 48개 전부 그림 · 출처 news.example.com) — 무대 · 표지 · 차트 · 카드 시험용.
 * 그림 파일은 대회 경로에 실제로 올린다(우리 Storage 복사본).
 */
export async function seedImageTournament(id = "imgT1"): Promise<{ id: string; contestantIds: string[] }> {
  const bucket = adminApp().storage().bucket();
  const contestantIds: string[] = [];
  const batch = db().batch();
  for (let i = 0; i < 48; i++) {
    const path = `entry-images/tournaments/${id}/${i}.jpg`;
    const body = readFileSync(FIXTURE_48[i]);
    await bucket.file(path).save(body, { contentType: "image/jpeg", resumable: false });
    await bucket.file(path.replace(/\.jpg$/, "_600.jpg")).save(body, { contentType: "image/jpeg", resumable: false });
    const cid = `${id}c${i}`;
    contestantIds.push(cid);
    batch.set(db().collection("contestants").doc(cid), {
      tournamentId: id,
      hostUid: ADMIN_UID,
      order: i + 1,
      name: `엔트리${String(i + 1).padStart(2, "0")}`,
      nationality: "KR",
      affiliation: "",
      imageSearchKeyword: "",
      media: {
        type: "image",
        image: {
          url: storageUrl(path),
          thumbUrl: storageUrl(path.replace(/\.jpg$/, "_600.jpg")),
          storagePath: path,
          origin: "url",
          sourceUrl: "https://news.example.com/a.jpg",
          sourcePage: "https://www.news.example.com/article/1",
          width: 1600,
          height: 900,
          addedAt: 1,
        },
      },
    });
  }
  batch.set(db().collection("tournaments").doc(id), {
    title: "IMAGE-1 그림 대회",
    titleI18n: { ko: "IMAGE-1 그림 대회", en: "IMAGE-1 Image Tournament", es: "IMAGE-1 Image Tournament" },
    description: { ko: "", en: "", es: "" },
    keywords: ["시험"],
    category: "KPOP",
    status: "active",
    hostUid: ADMIN_UID,
    tournamentDeadline: admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 86_400_000),
    currentRound: 1,
    totalContestants: 48,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    featured: true,
    entryUnit: "individual",
    thumbnailPair: { a: contestantIds[0], b: contestantIds[1], aPos: 50, bPos: 50 },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { id, contestantIds };
}

/** 금지 낱말(지시서 2-E) — 페이지 글자에 하나도 없어야 한다. "표"는 낱말일 때만(대표·표지는 괜찮다). */
export async function expectNoForbiddenWords(page: Page): Promise<void> {
  const text = await page.locator("body").innerText();
  const hits = [/투표/, /참가자/, /48명/, /월드컵/, /FIFA/, /\bVote\b/, /(^|\s)표(\s|$)/m, /팀 경로/].filter((re) => re.test(text));
  expect(hits.map(String), "금지 낱말").toEqual([]);
}

/** 유튜브 포스터(바깥 사이트)는 시험 그림으로 대신 준다 — CI 에서 바깥을 부르지 않는다. */
export async function stubYouTubeImages(page: Page): Promise<void> {
  await page.route(/i\.ytimg\.com/, (route) =>
    route.fulfill({ contentType: "image/jpeg", body: readFileSync(FIXTURE_48[0]) }),
  );
}
