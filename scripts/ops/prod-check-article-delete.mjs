/**
 * 실서비스 1회 확인 — 기사를 지우면 조회 칸(news_views)도 사라지는가 (PITCH-2 PR B 배포 뒤 확인 ③).
 *
 * GitHub Actions 수동 실행(.github/workflows/prod-check-article-delete.yml)에서만 돈다.
 * 관리자 열쇠 = 저장소 비밀 FIREBASE_ADMIN_SDK_KEY(자동 시험과 같은 것) — 화면 · 파일에 남기지 않는다.
 *
 *   ① 시험 기사 `e2e-delete-check-<실행 번호>` 를 발행 상태로 만든다(e2e: true · 제목에 [시험])
 *   ② 공개 콜러블 recordArticleView 를 한 번 부른다 → news_views/{slug} total 1
 *   ③ 기사를 지운다 → onArticleDeleted 가 news_views/{slug} 를 지우는지 60초까지 본다
 *   ④ 끝(성공이든 실패든) — 시험 기사와 조회 칸이 남았으면 지우고, 남지 않았음을 다시 읽어 확인한다
 * 결과 표는 실행 요약(GITHUB_STEP_SUMMARY)에 적는다.
 */
import { appendFileSync } from "node:fs";
import admin from "firebase-admin";

const PROJECT = "worldcrown48";
const FN = "https://asia-northeast3-worldcrown48.cloudfunctions.net/recordArticleView";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

const rows = [];
const row = (item, result, ok) => {
  rows.push(`| ${item} | ${result} | ${ok ? "✅" : "❌"} |`);
  console.log(`${ok ? "OK " : "NG "} ${item} — ${result}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sa = loadServiceAccount();
if (!sa) {
  console.error("FIREBASE_ADMIN_SDK_KEY 가 없다 — 멈춘다");
  process.exit(1);
}
if (sa.project_id !== PROJECT) {
  console.error(`열쇠의 프로젝트가 ${sa.project_id} — ${PROJECT} 가 아니라 멈춘다`);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const slug = `e2e-delete-check-${process.env.GITHUB_RUN_ID ?? Date.now()}`;
const newsRef = db.collection("news").doc(slug);
const viewsRef = db.collection("news_views").doc(slug);
let failed = false;

try {
  const now = admin.firestore.Timestamp.now();
  await newsRef.set({
    slug,
    status: "published",
    e2e: true,
    template: "column",
    origin: "manual_ai",
    title: { ko: "[시험] 지우기 확인 — 곧 지워짐", en: "[test] delete check", es: "[prueba] delete check" },
    subhead: { ko: "", en: "", es: "" },
    body: { ko: [], en: [], es: [] },
    evidence: { asOf: "", stats: [] },
    tournamentId: null,
    createdAt: now,
    publishedAt: now,
  });
  row("① 시험 기사 만들기", `news/${slug} (발행 · e2e: true)`, (await newsRef.get()).exists);

  const res = await fetch(FN, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: { slug } }),
  });
  const body = await res.json().catch(() => null);
  const counted = body?.result?.counted === true;
  await sleep(2_000);
  const total = (await viewsRef.get()).get("total");
  row("② 조회 1회 쌓기", `콜러블 HTTP ${res.status} · counted ${body?.result?.counted} · news_views total ${total ?? "없음"}`, counted && total === 1);
  if (!(counted && total === 1)) failed = true;

  await newsRef.delete();
  let gone = false;
  let waited = 0;
  for (; waited < 60_000; waited += 2_000) {
    if (!(await viewsRef.get()).exists) { gone = true; break; }
    await sleep(2_000);
  }
  row("③ 기사 지우기 → 조회 칸도 사라짐", gone ? `약 ${Math.round(waited / 1000)}초 뒤 news_views 사라짐` : "60초 지나도 남음", gone);
  if (!gone) failed = true;
} catch (err) {
  failed = true;
  row("실행 오류", String(err?.message ?? err).replace(/\|/g, "/"), false);
} finally {
  // 정리 — 남은 것이 있으면 지운다(트리거가 못 지웠을 때도 실서비스에 남기지 않는다).
  const leftNews = (await newsRef.get()).exists;
  const leftViews = (await viewsRef.get()).exists;
  if (leftNews) await newsRef.delete();
  if (leftViews) await viewsRef.delete();
  const finalNews = (await newsRef.get()).exists;
  const finalViews = (await viewsRef.get()).exists;
  row("④ 남은 시험 기사", finalNews ? "남아 있음" : `없음${leftNews ? " (정리 단계에서 지움)" : ""}`, !finalNews);
  row("④ 남은 조회 칸", finalViews ? "남아 있음" : `없음${leftViews ? " (정리 단계에서 지움)" : ""}`, !finalViews);
  const stray = await db.collection("news").where("e2e", "==", true).get();
  const strayDelete = stray.docs.filter((d) => d.id.startsWith("e2e-delete-check-"));
  row("④ 다른 e2e-delete-check 기사", `${strayDelete.length}건`, strayDelete.length === 0);
  if (finalNews || finalViews || strayDelete.length) failed = true;

  const table = ["## 기사 지우기 → 조회 칸 확인 (실서비스)", "", "| 항목 | 결과 | 판정 |", "|---|---|---|", ...rows, ""].join("\n");
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, table);
  console.log("\n" + table);
  process.exit(failed ? 1 : 0);
}
