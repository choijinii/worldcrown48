#!/usr/bin/env node
/**
 * backfill-name-i18n.mjs — 이미 발행된 대회의 엔트리 이름 3언어 채우기 (NAME-I18N-1 · 원장 D-61).
 *
 * 계획·검수표·쓰기 값은 전부 backfill-name-i18n.lib.mjs 에 있고 단위 시험으로 고정돼 있다.
 * 프롬프트·응답 읽기는 발행 때와 같은 코어(컴파일본 lib/core/translateContestantNamesCore.js)를
 * 쓴다 — 그래서 먼저 `npm --prefix functions run build` 가 필요하다.
 *
 * 기본은 **dry-run**: 대회마다 Haiku 1번 → 검수표 md 를 만든다. Firestore 에는 쓰지 않는다.
 * 대표 검수 → 표의 영어 칸 고침 → `--write <검수표>` 가 표의 값만 쓴다(AI 다시 부르지 않음).
 * 이미 nameI18n.en 이 있는 엔트리는 건너뛴다 — 다시 돌려도 안전하다.
 *
 * Usage (실행은 대표):
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" ANTHROPIC_API_KEY="…" node functions/scripts/backfill-name-i18n.mjs
 *   FIREBASE_ADMIN_SDK_KEY="$(cat <키파일>)" node functions/scripts/backfill-name-i18n.mjs --write <검수표.md>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";
import { runDryRun, runWrite } from "./backfill-name-i18n.lib.mjs";
import { translateContestantNamesCore } from "../lib/core/translateContestantNamesCore.js";
import { HAIKU_MODEL } from "../lib/core/models.js";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..", "..");

const HELP = `backfill-name-i18n — 발행된 대회의 엔트리 이름 3언어 채우기 (NAME-I18N-1)

  (옵션 없음)         dry-run: 대회마다 AI 1번 → 검수표 md 만 만든다. Firestore 에 쓰지 않음
  --out <경로>        검수표를 쓸 곳 (기본 outputs/NAME-I18N-1_이름검수표_<KST 날짜>.md)
  --write <검수표>    검수표의 영어 칸 값만 쓴다 (AI 호출 없음 · en = es · ko = name)
  --help, -h          이 도움말
`;

function parseArgs(argv) {
  const out = { write: null, out: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--write") out.write = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (out.write === undefined || out.out === undefined) throw new Error("경로가 빠졌다");
  return out;
}

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

function kstDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Argument error: ${err.message}\n\n${HELP}`);
    process.exit(1);
  }
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error("ABORT: FIREBASE_ADMIN_SDK_KEY 가 필요하다 (서비스 계정 키 JSON 또는 base64).");
    process.exit(1);
  }
  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();
  console.log(`project: ${serviceAccount.project_id}`);

  const deps = {
    loadTournaments: async () =>
      (await db.collection("tournaments").get()).docs.map((d) => ({ id: d.id, ...d.data() })),
    loadContestants: async () =>
      (await db.collection("contestants").get()).docs.map((d) => ({ id: d.id, ...d.data() })),
    translate: null,
    write: async (writes) => {
      // Firestore 배치 상한 500 — 여유를 둔다. nameI18n 한 칸만 고친다(merge update).
      for (let i = 0; i < writes.length; i += 400) {
        const batch = db.batch();
        for (const w of writes.slice(i, i + 400)) {
          batch.update(db.collection("contestants").doc(w.id), { nameI18n: w.nameI18n });
        }
        await batch.commit();
      }
    },
  };

  if (opts.write) {
    const md = readFileSync(opts.write, "utf8");
    const { writes, skipped } = await runWrite(deps, md);
    console.log(`WRITE — ${writes.length}개 썼다 · 건너뜀 ${skipped.length}개`);
    for (const s of skipped) console.log(`  · ${s.id}: ${s.reason}`);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ABORT: dry-run 은 AI 를 부른다 — ANTHROPIC_API_KEY 가 필요하다.");
    process.exit(1);
  }
  const anthropic = new Anthropic({ apiKey });
  deps.translate = (entries, category) =>
    translateContestantNamesCore(
      { entries, category },
      {
        createMessage: async (prompt) => {
          const resp = await anthropic.messages.create({
            model: HAIKU_MODEL,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
          });
          const block = resp.content[0];
          return block && block.type === "text" ? block.text : "";
        },
        logError: (msg) => console.error(`  ⚠ ${msg}`),
      },
    );
  deps.write = async () => {
    throw new Error("dry-run 은 쓰지 않는다");
  };

  const date = kstDate();
  const { md, summary } = await runDryRun(deps, { date });
  const outPath = opts.out ?? join(ROOT, "outputs", `NAME-I18N-1_이름검수표_${date}.md`);
  writeFileSync(outPath, md);
  console.log(
    `DRY-RUN — 대회 ${summary.tournaments}개 · 이름 ${summary.names}개 · 확신 낮음 ${summary.unsure} · ` +
      `받지 못함 ${summary.failed} · 발음 안 맞아 비움 ${summary.mismatch} · 이미 채워짐 ${summary.alreadyFilled}`,
  );
  console.log(`검수표: ${outPath}`);
  console.log("Firestore 에는 쓰지 않았다. 검수 뒤 --write <검수표> 로 쓴다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
