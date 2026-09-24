/**
 * seed-chart-preview — 눈검사용 "시험용 대회" 하나를 심고/지운다 (ARENA-1 PR 3).
 *
 * ## 왜 필요한가
 *
 * 실제 대회의 차트는 **점수가 안 보이는 것이 정상**이다. 정본 §5의 10판 기준을 아직
 * 넘지 못했고, 크론 발표(KST 09:00·21:00)도 아직 돌지 않았기 때문이다. 그래서 실제
 * 대회만으로는 "차트가 제대로 그려지는가"를 눈으로 볼 수 없다.
 *
 * 이 스크립트는 `ranking_cache` 를 직접 채운 대회를 하나 만들어 그 화면을 보게 한다.
 * 크론이 만들어 낼 문서와 **같은 모양**을 쓴다 — 모양이 다르면 눈검사가 거짓말이 된다.
 *
 * ## 팬에게 보이지 않는다
 *
 * `status: "draft"` · `featured: false` 라 The Pitch 피드에도, Launch Pad 히어로에도
 * 오르지 않는다(피드는 `featured == true` 만 읽는다). 주소를 아는 사람만 본다.
 *
 * ## 쓰는 법
 *
 *   FIREBASE_ADMIN_SDK_KEY=... node scripts/seed-chart-preview.mjs          # 심기
 *   FIREBASE_ADMIN_SDK_KEY=... node scripts/seed-chart-preview.mjs --clean  # 지우기
 *
 * 인증: FIREBASE_ADMIN_SDK_KEY (서비스 계정 JSON 원문 또는 base64). Admin SDK 라
 * 규칙을 우회하므로 `ranking_cache` 에 쓸 수 있다(그 컬렉션은 클라이언트 쓰기 금지).
 *
 * ⚠️ **눈검사가 끝나면 반드시 `--clean` 으로 지운다.** 시험용 데이터가 남으면 크론이
 * 이 대회를 집계 창에 넣고(마감 전이므로), 진짜가 아닌 숫자가 계속 살아 있게 된다.
 */
import admin from "firebase-admin";

const TOURNAMENT_ID = "chart-preview-eyecheck";

const HELP = `seed-chart-preview — 눈검사용 시험용 대회

  FIREBASE_ADMIN_SDK_KEY=... node scripts/seed-chart-preview.mjs
  FIREBASE_ADMIN_SDK_KEY=... node scripts/seed-chart-preview.mjs --clean
`;

/** 크론(`buildRankingUpdate`)이 쓰는 것과 같은 모양의 한 줄. */
function entry(rank, id, name, crownScore, placementRate, winRate, shareRate) {
  return {
    rank,
    contestantId: id,
    name,
    videoId: null,
    // 내부 전용 — 화면은 절대 그리지 않는다(원칙 #8). 경보(T-1·T-2)만 읽는다.
    voteCount: 1234,
    rate: 25,
    crownScore,
    placementRate,
    winRate,
    shareRate,
  };
}

/**
 * 1위는 정본 §4 계산 예시의 **549점** 그대로다 — 눈으로 본 숫자가 정본의 어느 줄에서
 * 왔는지 바로 확인된다.
 */
const RANKINGS = [
  entry(1, "cp-1", "AURORA", 549, 0.515, 0.3, 0.843),
  entry(2, "cp-2", "NOVA", 431, 0.44, 0.21, 0.72),
  entry(3, "cp-3", "HALO", 318, 0.33, 0.14, 0.55),
  entry(4, "cp-4", "LUMEN", 262, 0.28, 0.1, 0.47),
  entry(5, "cp-5", "ECHO", 149, 0.17, 0.04, 0.29),
];

function loadServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_SDK_KEY;
  if (!raw) return null;
  const decoded = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(decoded);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(HELP);
    return;
  }
  const clean = argv.includes("--clean");

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.error(
      "ABORT: FIREBASE_ADMIN_SDK_KEY 가 필요합니다 (서비스 계정 키 JSON 또는 base64).",
    );
    process.exit(1);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  if (clean) {
    await db.doc(`ranking_cache/${TOURNAMENT_ID}`).delete().catch(() => undefined);
    await db.doc(`tournaments/${TOURNAMENT_ID}`).delete().catch(() => undefined);
    console.log(`[seed-chart-preview] 지웠다: ${TOURNAMENT_ID}`);
    return;
  }

  // 마감은 넉넉히 뒤 — **마감 전에도 차트가 열린다**(D-30)는 것을 이 화면이 증명한다.
  const deadline = admin.firestore.Timestamp.fromMillis(
    Date.now() + 30 * 86_400 * 1000,
  );

  await db.doc(`tournaments/${TOURNAMENT_ID}`).set({
    title: "차트 눈검사용 (Chart Eye-check)",
    titleI18n: {
      ko: "차트 눈검사용",
      en: "Chart Eye-check",
      es: "Revisión de Listas",
    },
    category: "K-POP",
    // draft + featured:false → The Pitch 피드·Launch Pad 히어로에 오르지 않는다.
    status: "draft",
    featured: false,
    hostUid: "seed-chart-preview",
    currentRound: 1,
    totalContestants: 48,
    tournamentDeadline: deadline,
    settings: { aiNews: false, multiLang: false, showRanking: true },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.doc(`ranking_cache/${TOURNAMENT_ID}`).set({
    tournamentId: TOURNAMENT_ID,
    rankings: RANKINGS,
    totalVotes: 6170,
    // 10판 기준(정본 §5)을 넘긴 값 — 이 값이 10 미만이면 기다림 안내가 나온다.
    runsTotal: 120,
    generationSequence: 1,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    previousGeneratedAt: null,
  });

  console.log(`[seed-chart-preview] 심었다: ${TOURNAMENT_ID}`);
  console.log(`  /arena/${TOURNAMENT_ID}/ranking?lang=ko|en|es`);
  console.log("  눈검사가 끝나면 --clean 으로 반드시 지운다.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
