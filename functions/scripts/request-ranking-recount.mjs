#!/usr/bin/env node
/**
 * request-ranking-recount.mjs — T5 차트 증분 집계의 운영자 다시 세기 요청.
 *
 * 왜 있나. 되돌리기(이전 함수로 롤백) 뒤 다시 배포하면, 롤백 동안 옛 크론이 누적을 건드리지 않은 채
 * 기록만 쌓이거나 지워졌을 수 있다 — 증분은 "지난 누적이 맞다"를 믿으므로 그 믿음을 버리게 한다.
 * 이 스크립트는 `ranking_recount_requests/{tid}` 에 요청 문서만 쓴다. 실제 다시 세기는 다음 발표
 * (09:00 · 21:00 KST)가 처음부터 하고, 예산에 닿으면 5분 도우미가 잇는다.
 *
 * 쓰는 곳은 요청 문서 쓰기 한 곳뿐이다(시험이 소스 글자로 확인). 누적 · job · 캐시 · 기록은 건드리지 않는다.
 *
 * Usage (먼저 `cd functions && npm run build` — 빌드 결과 lib/core 를 가져온다):
 *   gcloud auth application-default login     # ADC. 또는 FIREBASE_ADMIN_SDK_KEY(JSON/base64)
 *   node functions/scripts/request-ranking-recount.mjs --project wc48-xxxx --tournament <tid>
 *   node functions/scripts/request-ranking-recount.mjs --project wc48-xxxx --all-in-window
 *   node functions/scripts/request-ranking-recount.mjs --project wc48-xxxx --all-in-window --apply
 *
 * 기본은 dry-run(쓸 문서만 출력). `--apply` 가 있어야 쓴다.
 * 에뮬레이터: FIRESTORE_EMULATOR_HOST 가 있으면 그쪽을 본다.
 */
import admin from "firebase-admin";
import { REQUESTS } from "../lib/core/rankingAccumStore.js";
import { rankingWindowStartMs } from "../lib/core/rankingWindow.js";

const HELP = `request-ranking-recount — 다시 세기 요청 문서 쓰기 (기본 dry-run)

  --project <id>       필수. Firebase 프로젝트 id
  --tournament <tid>   이 대회 하나
  --all-in-window      집계 창 안 대회 전부(크론과 같은 쿼리)
  --apply              실제로 쓴다. 없으면 무엇을 쓸지 출력만
  --help, -h           이 도움말

  --tournament 와 --all-in-window 중 하나만 준다.
`;

function argValue(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function initAdmin(projectId) {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (raw) {
    const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(decoded)), projectId });
  } else {
    // ADC(gcloud auth application-default login) 또는 에뮬레이터.
    admin.initializeApp({ projectId });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const projectId = argValue(args, "--project");
  if (!projectId) {
    console.error("--project <id> 가 필요하다.\n" + HELP);
    process.exit(1);
  }
  const tid = argValue(args, "--tournament");
  const allInWindow = args.includes("--all-in-window");
  if (!!tid === allInWindow) {
    console.error("--tournament <tid> 와 --all-in-window 중 하나만 준다.\n" + HELP);
    process.exit(1);
  }
  const apply = args.includes("--apply");
  initAdmin(projectId);
  const db = admin.firestore();
  const nowMs = Date.now();

  let ids;
  if (tid) {
    ids = [tid];
  } else {
    // 크론(scheduleRankingCache)과 같은 쿼리 — 마감이 창 시작보다 뒤인 대회.
    const windowStart = admin.firestore.Timestamp.fromMillis(rankingWindowStartMs(nowMs));
    const snap = await db.collection("tournaments").where("tournamentDeadline", ">", windowStart).get();
    ids = snap.docs.map((d) => d.id);
  }

  console.log(`project: ${projectId} · 대상 ${ids.length}건 · ${apply ? "쓰기(--apply)" : "dry-run(쓰지 않음)"}`);
  for (const id of ids) {
    console.log(`  ${REQUESTS}/${id} ← { tournamentId: "${id}", reason: "admin", requestedAt: 서버 시각 }`);
    if (!apply) continue;
    // 요청은 대회당 문서 하나(merge) — 이미 있으면 시각만 늦춘다. 다시 세기 시작 뒤에 들어온 요청은
    // 그 다시 세기가 지우지 않으므로(rankingAccumStore runRecount) 한 번 더 세어질 뿐이다.
    await db
      .collection(REQUESTS)
      .doc(id)
      .set({ tournamentId: id, reason: "admin", requestedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }
  if (!apply) console.log("\n쓰려면 같은 명령에 --apply 를 붙인다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
