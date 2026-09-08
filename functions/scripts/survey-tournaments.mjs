#!/usr/bin/env node
/**
 * survey-tournaments.mjs — READ-ONLY 실측. RUN-1 PR 2 배포 전제 0단계의 ① 단계.
 *
 * 왜 있나. PR 2가 `onVote` 의 마감 강제를 되살린다(§14). 2026-09-07 실측에서 The Pitch
 * "진행 중" 12개 중 **마감이 남은 Tournament가 0개**였다 — 정리 없이 켜면 09-06 P0가
 * 문구만 붙은 채 재발한다. 무엇을 연장하고 무엇을 숨길지는 **대표님이 정한다.** 이 스크립트는
 * 그 결정에 필요한 표를 뽑을 뿐 **아무것도 쓰지 않는다.**
 *
 * 정리(쓰기)는 별도 스크립트가 맡는다 — 대표님이 목록·날짜를 확정한 뒤에 만든다.
 *
 * Usage:
 *   FIREBASE_ADMIN_SDK_KEY="$(cat ~/.secrets/wc48-admin.json)" \
 *     node functions/scripts/survey-tournaments.mjs
 *   node functions/scripts/survey-tournaments.mjs --json   # 기계 판독용
 *
 * Auth: FIREBASE_ADMIN_SDK_KEY (raw JSON 또는 base64) — 관례는 seed-categories.mjs 와 동일.
 * admin SDK는 보안 규칙을 우회하므로 특권 도구지만, 이 스크립트에는 쓰기 경로가 없다.
 */
import admin from "firebase-admin";

const HELP = `survey-tournaments — tournaments 전수 + 0단계 잔여 테스트 데이터 실측 (읽기 전용)

  (no flag)    사람이 읽는 표
  --json       JSON 출력
  --help, -h   이 도움말
`;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

/** Firestore Timestamp | Date | null → ms. 다른 값은 null(= 마감 없음)로 읽는다. */
function toMillis(v) {
  if (!v) return null;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return null;
}

const KST = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function fmtKst(ms) {
  return ms === null ? "—" : KST.format(new Date(ms)).replace(" ", " ");
}

/** 시드/미리보기 계열인가 — 문서 id 관례로만 판정한다(제목은 사람이 본다). */
function looksSeeded(id) {
  return /^(a1-preview|admin-preview|preview|seed|test)/i.test(id);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const asJson = args.includes("--json");

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error("ABORT: FIREBASE_ADMIN_SDK_KEY is required.");
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();
  const now = Date.now();

  const snap = await db.collection("tournaments").get();
  const rows = snap.docs
    .map((d) => {
      const t = d.data();
      const deadlineMs = toMillis(t.tournamentDeadline);
      return {
        id: d.id,
        title: typeof t.title === "string" ? t.title : "",
        status: t.status ?? "(none)",
        deadlineMs,
        deadlineKst: fmtKst(deadlineMs),
        // The Pitch 는 status == "active" 만 보여준다 (lib/pitch/pitchStore.ts:52).
        visibleInPitch: t.status === "active",
        deadlinePassed: deadlineMs !== null && deadlineMs < now,
        hasDeadline: deadlineMs !== null,
        seedLike: looksSeeded(d.id),
      };
    })
    .sort((a, b) => {
      if (a.visibleInPitch !== b.visibleInPitch) return a.visibleInPitch ? -1 : 1;
      return (a.deadlineMs ?? Infinity) - (b.deadlineMs ?? Infinity);
    });

  // 0단계 잔여 테스트 데이터 — 익명 uid 가 남긴 기록. uid 목록을 만들 수 없으므로
  // (Auth 전수 조회는 별개 비용) 컬렉션별 문서 수만 세어 규모를 보고한다.
  const collections = ["votes", "roundProgress", "tournament_runs", "guest_runs", "crown_cards"];
  const counts = {};
  for (const c of collections) {
    counts[c] = (await db.collection(c).count().get()).data().count;
  }

  // 진행 중인 판(= roundProgress 가 있고 complete !== true) — §3.0 조건 4 배포 판단 기준.
  const progressSnap = await db.collection("roundProgress").get();
  const inFlight = progressSnap.docs.filter((d) => d.get("complete") !== true).length;

  if (asJson) {
    console.log(JSON.stringify({ rows, counts, inFlight, now }, null, 2));
    return;
  }

  const live = rows.filter((r) => r.visibleInPitch);
  console.log(
    `\ntournaments 전수 ${rows.length}건 · The Pitch 노출(status=active) ${live.length}건 · 기준 시각 ${fmtKst(now)} KST\n`,
  );
  const head = ["Pitch", "id", "status", "마감(KST)", "마감상태", "제목"];
  console.log(head.join("\t"));
  for (const r of rows) {
    const state = !r.hasDeadline ? "마감없음" : r.deadlinePassed ? "지남" : "남음";
    console.log(
      [r.visibleInPitch ? "노출" : "숨김", r.id, r.status, r.deadlineKst, state, r.title].join("\t"),
    );
  }

  console.log(`\n노출 중 분류: 마감 남음 ${live.filter((r) => !r.deadlinePassed && r.hasDeadline).length} · 마감 지남 ${live.filter((r) => r.deadlinePassed).length} · 마감 없음 ${live.filter((r) => !r.hasDeadline).length}`);
  console.log(`시드/미리보기 id 형태: ${rows.filter((r) => r.seedLike).length}건`);
  console.log(`\n컬렉션 문서 수: ${collections.map((c) => `${c}=${counts[c]}`).join(" · ")}`);
  console.log(`진행 중인 판(roundProgress complete!==true): ${inFlight}건`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
