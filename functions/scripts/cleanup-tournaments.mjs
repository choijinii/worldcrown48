#!/usr/bin/env node
/**
 * cleanup-tournaments.mjs — RUN-1 PR 2 배포 전제 0단계의 ③ 실행 층.
 *
 * 계획(무엇을 어디에 쓰는가)은 전부 cleanup-tournaments.lib.mjs 에 있고 단위 테스트로
 * 고정돼 있다. 여기는 그 계획을 Firestore에 옮겨 적기만 한다.
 *
 * ⚠️ §5 DON'T 3(마이그레이션 스크립트 금지)의 **예외** — 스키마 변환이 아니라 데이터
 * 정리이며 2026-09-07·09-08 대표 확정 처리안의 이행이다.
 *
 * 기본은 **dry-run**(아무것도 쓰지 않음). 쓰려면 --apply 를 명시한다 — migrate-categories
 * 와 같은 자세다. 되돌리기 어려운 작업에서 기본값이 "쓴다"이면 안 된다.
 *
 * Usage:
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/cleanup-tournaments.mjs
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/cleanup-tournaments.mjs --apply
 *   ... --apply --delete-test-data   # 0단계 잔여 익명 기록까지 삭제
 */
import admin from "firebase-admin";
import {
  EXTENDED_DEADLINE_KST,
  PROTECTED_UIDS,
  TEST_ANON_UIDS,
  TEST_DATA_COLLECTIONS,
  assertPlanIsSound,
  describeStep,
  planTournamentCleanup,
} from "./cleanup-tournaments.lib.mjs";

const HELP = `cleanup-tournaments — 마감 연장 4건 + 숨김 15건 (+ 0단계 잔여 데이터 삭제)

  (no flag)           dry-run — 계획만 출력하고 아무것도 쓰지 않는다
  --apply             tournaments 문서에 실제로 쓴다
  --delete-test-data  0단계 테스트가 남긴 익명 uid의 기록도 지운다 (--apply 필요)
  --help, -h          이 도움말
`;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

async function deleteTestData(db, apply) {
  // 보호 계정이 목록에 섞여 들어오면 즉시 멈춘다 — 이 스크립트가 낼 수 있는 최악의 사고다.
  const clash = TEST_ANON_UIDS.filter((uid) => PROTECTED_UIDS.includes(uid));
  if (clash.length > 0) {
    throw new Error(`ABORT: 삭제 목록에 보호 대상 uid가 있습니다: ${clash.join(", ")}`);
  }

  let total = 0;
  for (const uid of TEST_ANON_UIDS) {
    for (const coll of TEST_DATA_COLLECTIONS) {
      // votes 는 소유자가 필드에 있고, 나머지는 문서 id 접두사에 있다.
      const refs =
        coll === "votes"
          ? (await db.collection(coll).where("userId", "==", uid).get()).docs
          : (await db.collection(coll).get()).docs.filter(
              (d) => d.id.split("_")[0] === uid,
            );
      for (const d of refs) {
        console.log(`  ${apply ? "✗ 삭제" : "· 삭제 예정"} ${coll}/${d.id}`);
        if (apply) await d.ref.delete();
        total += 1;
      }
    }
  }
  console.log(`  → ${TEST_ANON_UIDS.length}개 uid · ${total}문서`);
  return total;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }
  const apply = args.includes("--apply");
  const deleteTest = args.includes("--delete-test-data");
  const unknown = args.filter(
    (a) => !["--apply", "--delete-test-data"].includes(a),
  );
  if (unknown.length > 0) {
    console.error(`Unknown argument: ${unknown.join(", ")}\n${HELP}`);
    process.exit(1);
  }
  if (deleteTest && !apply) {
    console.error("ABORT: --delete-test-data 는 --apply 와 함께 써야 합니다.");
    process.exit(1);
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error("ABORT: FIREBASE_ADMIN_SDK_KEY is required.");
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  const deadlineMs = Date.parse(EXTENDED_DEADLINE_KST);
  const plan = assertPlanIsSound(planTournamentCleanup({ deadlineMs }));

  console.log(
    `\ncleanup-tournaments: ${plan.length}건 · ${apply ? "APPLY (쓴다)" : "DRY-RUN (쓰지 않는다)"}\n`,
  );

  let missing = 0;
  for (const step of plan) {
    const ref = db.doc(`tournaments/${step.id}`);
    const snap = await ref.get();
    if (!snap.exists) {
      // 목록이 실측과 어긋났다는 뜻 — 조용히 만들지 말고 드러낸다.
      console.log(`  ⚠ 없음  ${step.id} — 건너뜀 (목록과 실제가 다르다)`);
      missing += 1;
      continue;
    }
    console.log(`  ${apply ? "✓" : "·"} ${describeStep(step)}`);
    if (!apply) continue;
    const patch =
      step.op === "extend"
        ? { tournamentDeadline: admin.firestore.Timestamp.fromMillis(deadlineMs) }
        : step.patch;
    await ref.update(patch);
  }

  if (deleteTest) {
    console.log("\n0단계 잔여 테스트 데이터:");
    await deleteTestData(db, apply);
  }

  console.log(
    `\n완료. 연장 4 · 숨김 15 · 누락 ${missing}${apply ? "" : "  (dry-run — 다시 --apply 로 실행하세요)"}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
