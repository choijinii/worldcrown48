#!/usr/bin/env node
/**
 * survey-rate-articles.mjs — READ-ONLY. T5 PR 2 · 옛 rate · 퍼센트가 남은 기사 조사.
 *
 * 왜 있나. 기사 숫자 허용 목록(대표 확정 2026-11-25)으로 옛 rate 칸("TOP RATE" · "RUNNER-UP RATE"
 * · "TOP MOMENTUM")이 빠졌다. 이미 만들어진 기사에 그 칸이 얼마나 남았는지 대표가 보도록
 * `news` 컬렉션을 **읽기만** 해서 목록을 낸다. 고치거나 지우지 않는다(대표 결정 · 보고만).
 * 이 스크립트에는 쓰기 경로가 없다(시험이 소스 글자로 확인한다).
 *
 * Usage:
 *   gcloud auth application-default login     # ADC. 또는 FIREBASE_ADMIN_SDK_KEY(JSON/base64)
 *   node functions/scripts/survey-rate-articles.mjs --project <id>
 *   node functions/scripts/survey-rate-articles.mjs --project <id> --out outputs/t5-evidence/rate-articles.md
 *   node functions/scripts/survey-rate-articles.mjs --project <id> --json
 *
 * 에뮬레이터: FIRESTORE_EMULATOR_HOST 가 있으면 그쪽을 본다.
 * --out 은 로컬 파일만 쓴다(Firestore 에는 아무것도 쓰지 않는다).
 */
import { writeFileSync } from "node:fs";
import admin from "firebase-admin";
import { surveyRows, renderMarkdown, fmtKstDate } from "./survey-rate-articles.lib.mjs";

const HELP = `survey-rate-articles — 옛 rate · 퍼센트가 남은 기사 (읽기 전용)

  --project <id>   필수. Firebase 프로젝트 id
  --out <path>     Markdown 목록을 이 로컬 파일로도 저장
  --json           JSON 출력
  --help, -h       이 도움말
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
  initAdmin(projectId);
  const db = admin.firestore();

  const snap = await db.collection("news").get();
  const docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
  const rows = surveyRows(docs);

  if (args.includes("--json")) {
    console.log(JSON.stringify({ project: projectId, scanned: docs.length, rows }, null, 2));
    return;
  }
  const md = renderMarkdown(rows, { project: projectId, scanned: docs.length, at: fmtKstDate(new Date()) });
  console.log(md);
  const out = argValue(args, "--out");
  if (out) {
    writeFileSync(out, md, "utf8");
    console.error(`저장: ${out}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
