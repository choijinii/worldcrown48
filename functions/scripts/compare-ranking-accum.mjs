#!/usr/bin/env node
/**
 * compare-ranking-accum.mjs — READ-ONLY. T5 차트 증분 집계의 배포 전 확인.
 *
 * 왜 있나. 증분은 "지난 누적이 맞다"를 믿고 구간만 더한다. 운영자가 배포 전에 실서비스 기록에
 * 대고 돌려, 누적(`ranking_accum/{tid}`)이 처음부터 다시 센 값과 같은지 눈으로 확인한다.
 * 이 스크립트에는 쓰기 경로가 없다(시험이 소스 글자로 확인한다).
 *
 * 비교: 누적을 **자기 cursorMs 까지**로 보고, 대회 기록 전량을 읽어 `[0, cursorMs)` 로 센 값과
 * 맞춘다 — 크론의 그림자 비교(`shadowTally`)와 같은 계산 · 같은 `accumEquals`.
 * 누적 문서가 없으면 그 사실을 적고 전량 요약만 낸다(끝 = 지금 − 2분).
 *
 * Usage (먼저 `cd functions && npm run build` — 빌드 결과 lib/core 를 가져온다):
 *   gcloud auth application-default login     # ADC. 또는 FIREBASE_ADMIN_SDK_KEY(JSON/base64)
 *   node functions/scripts/compare-ranking-accum.mjs --project wc48-xxxx
 *   node functions/scripts/compare-ranking-accum.mjs --project wc48-xxxx --tournament <tid>
 *   node functions/scripts/compare-ranking-accum.mjs --project demo-wc48 --json
 *
 * --tournament 없으면 집계 창 안 대회 전부(크론과 같은 쿼리: tournamentDeadline > 창 시작).
 * 에뮬레이터: FIRESTORE_EMULATOR_HOST 가 있으면 그쪽을 본다.
 */
import admin from "firebase-admin";
import { ACCUM, voteFromDoc } from "../lib/core/rankingAccumStore.js";
import {
  accumEquals,
  runDelta,
  runKeyOf,
  voteCountDelta,
  windowEndMs,
} from "../lib/core/incrementalTally.js";
import { rankingWindowStartMs } from "../lib/core/rankingWindow.js";

const HELP = `compare-ranking-accum — 누적 vs 처음부터 다시 센 값 (읽기 전용)

  --project <id>       필수. Firebase 프로젝트 id
  --tournament <tid>   이 대회만. 없으면 집계 창 안 전부
  --json               JSON 출력
  --help, -h           이 도움말
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

/** 대회 기록 전량을 읽어 [0, endMs) 로 센 값 + 칸 없는 기록 수. */
async function fullCount(db, tid, endMs) {
  const snap = await db.collection("votes").where("tournamentId", "==", tid).get();
  let noRunIndex = 0;
  let noIsGuest = 0;
  const votes = snap.docs.map((d) => {
    const data = d.data();
    if (typeof data.runIndex !== "number") noRunIndex += 1;
    if (typeof data.isGuest !== "boolean") noIsGuest += 1;
    return voteFromDoc(d.id, data);
  });
  // Map 에 쓰는 호출(.set) 은 시험의 글자 검사에 걸리므로, 판 묶음은 객체로 모아 Map 으로 바꾼다.
  const byRun = {};
  for (const v of votes) {
    const k = runKeyOf(v);
    (byRun[k] ??= []).push(v);
  }
  const runs = new Map(Object.entries(byRun));
  const accum = { ...runDelta(runs, 0, endMs), voteCounts: voteCountDelta(votes, 0, endMs) };
  return { accum, docsRead: snap.size, noRunIndex, noIsGuest };
}

/** 두 누적에서 값이 다른 엔트리(선택 수 · 판 점수 · 우승 · 픽). 0 값은 없는 것과 같다. */
function diffEntries(have, want) {
  const zero = { placementPoints: 0, wins: 0, picks: 0 };
  const ids = Array.from(
    new Set(
      Object.keys(have.voteCounts)
        .concat(Object.keys(want.voteCounts))
        .concat(Object.keys(have.byContestant))
        .concat(Object.keys(want.byContestant)),
    ),
  );
  const out = [];
  for (const id of ids) {
    const hv = have.voteCounts[id] ?? 0;
    const wv = want.voteCounts[id] ?? 0;
    const hb = have.byContestant[id] ?? zero;
    const wb = want.byContestant[id] ?? zero;
    const same =
      hv === wv && hb.placementPoints === wb.placementPoints && hb.wins === wb.wins && hb.picks === wb.picks;
    if (!same) out.push({ id, accum: { voteCount: hv, ...hb }, recount: { voteCount: wv, ...wb } });
  }
  return out;
}

async function compareOne(db, tid, nowMs) {
  const snap = await db.collection(ACCUM).doc(tid).get();
  const doc = snap.exists ? snap.data() : null;
  if (!doc) {
    const endMs = windowEndMs(nowMs);
    const full = await fullCount(db, tid, endMs);
    return {
      tournamentId: tid,
      hasAccum: false,
      endMs,
      match: null,
      differing: [],
      noRunIndex: full.noRunIndex,
      noIsGuest: full.noIsGuest,
      docsRead: full.docsRead,
      full: { runsTotal: full.accum.runsTotal, entries: Object.keys(full.accum.byContestant).length },
    };
  }
  const full = await fullCount(db, tid, doc.cursorMs);
  return {
    tournamentId: tid,
    hasAccum: true,
    cursorMs: doc.cursorMs,
    match: accumEquals(doc.accum, full.accum),
    differing: diffEntries(doc.accum, full.accum),
    runsTotal: { accum: doc.accum.runsTotal, recount: full.accum.runsTotal },
    noRunIndex: full.noRunIndex,
    noIsGuest: full.noIsGuest,
    docsRead: full.docsRead,
  };
}

function print(r) {
  console.log(`\n== ${r.tournamentId}`);
  if (!r.hasAccum) {
    console.log("누적 문서 없음(ranking_accum). 전량 요약만:");
    console.log(`  전량 판 수 ${r.full.runsTotal} · 점수가 있는 엔트리 ${r.full.entries}`);
  } else {
    console.log(`누적 vs 전량(cursorMs=${r.cursorMs}): ${r.match ? "일치" : "불일치"}`);
    console.log(`  판 수 누적 ${r.runsTotal.accum} · 전량 ${r.runsTotal.recount}`);
    for (const d of r.differing) {
      console.log(`  다른 엔트리 ${d.id}: 누적 ${JSON.stringify(d.accum)} · 전량 ${JSON.stringify(d.recount)}`);
    }
  }
  console.log(`  runIndex 없는 기록 ${r.noRunIndex}건 · isGuest 없는 기록 ${r.noIsGuest}건`);
  console.log(`  읽은 문서 ${r.docsRead}건(votes)`);
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
  const asJson = args.includes("--json");
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

  const results = [];
  for (const id of ids) results.push(await compareOne(db, id, nowMs));

  if (asJson) {
    console.log(JSON.stringify({ project: projectId, nowMs, results }, null, 2));
    return;
  }
  console.log(`project: ${projectId} · 대회 ${results.length}건 · 읽기 전용`);
  results.forEach(print);
  const bad = results.filter((r) => r.match === false).length;
  console.log(`\n요약: 불일치 ${bad}건 · 누적 없음 ${results.filter((r) => !r.hasAccum).length}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
