/**
 * cleanup-tournaments.lib.mjs — RUN-1 PR 2 배포 전제 0단계의 **순수 계획 층**.
 *
 * 왜 순수한가. 이 정리는 프로덕션 `tournaments` 를 고치는 특권 작업이고 되돌리기 어렵다.
 * "어느 문서에 무엇을 쓰는가"를 Firestore 없이 테스트할 수 있어야 실행 전에 확인이 된다
 * (관례: backfill-news-display-term.lib.mjs · seed-preview.lib.mjs).
 *
 * ⚠️ 이것은 §5 DON'T 3(마이그레이션 스크립트 금지)의 **예외**다 — 스키마 변환이 아니라
 * 데이터 정리이며, 2026-09-07 대표 확정 처리안의 이행이다. 목록·날짜·status 값은 전부
 * 2026-09-08 대표 확정본이며 이 파일 밖에서 만들어지지 않는다.
 *
 * 배경: PR 2가 `onVote` 의 마감 강제를 되살린다(§14). 2026-09-08 실측에서 `status=active`
 * 19건 중 **마감이 남은 Tournament가 0건**이었다 — 정리 없이 켜면 09-06 P0가 문구만 붙은
 * 채 재발한다.
 */

/** 대표 확정 2026-09-08 — 실제 팬용 4개의 새 Tournament Deadline (KST). */
export const EXTENDED_DEADLINE_KST = "2026-11-30T23:59:00+09:00";

/**
 * 숨김에 쓰는 status 값.
 *
 * `hidden`·`archived` 는 **코드에 존재하지 않는다** — `TournamentStatus` 는
 * `active | ended | draft` 세 값뿐이다(lib/types/tournament.ts). 이미 숨겨져 있는
 * 미리보기 3건(a1-preview-5·6 · dev-preview-lab)이 `draft` 를 쓰고 있어 선례를 따른다.
 * The Pitch 는 `status == "active"` 만 조회하므로(lib/pitch/pitchStore.ts) draft 는 빠진다.
 */
export const HIDDEN_STATUS = "draft";

/** 마감을 연장할 실제 팬용 Tournament (2026-09-08 실측으로 마감 날짜까지 대조 확인). */
export const EXTEND_IDS = [
  "FbzCreuLSW4l7u0VUsKs", // 현재 활동하는 kpop여자 아이돌… (구 마감 2026-09-03)
  "Ob0J9vBpOmQ9bGaqt1ws", // 현재 Kpop 아티스트중에…      (구 마감 2026-08-24)
  "i4D6ghnCTflykgwbBwsH", // 현존하는 최고의 댄스퍼포먼스… (구 마감 2026-08-16)
  "qdJa6rqKuVhMlCCk5OdS", // 테스트 토너먼트-3 틱톡커…     (구 마감 2026-08-04)
];

/** 숨길 Tournament — 시드·미리보기·테스트 10건. */
export const HIDE_SEED_IDS = [
  "a1-preview-1",
  "a1-preview-2",
  "a1-preview-3",
  "a1-preview-4",
  "admin-preview-1",
  "admin-preview-2",
  "admin-preview-3",
  "dev-preview",
  "c0SlL0gRlccslnBljugi", // 테스트 토너먼트 1
  "cwfCpeLnn4IOnLwrvfaJ", // 테스트 토너먼트-2
];

/** 숨길 Tournament — 마감이 설정되지 않은 5건(Host가 Deadline을 안 정한 미완성 상태). */
export const HIDE_NO_DEADLINE_IDS = [
  "dtpqFwB6k7pMelJxKUco", // 발로란트 글로벌 최고 플레이어!!
  "bDFmGsT80V0cpwacD2Cq", // 현재 판매되는 라면 중에 가장 맛있는 라면은 ?
  "SR5EARcTglfP0tbXqWlT", // 현존하는 가장 아름다운 k-pop 여자 아이돌은 누구일까?
  "ujNKXHiEvj3mldZNTjvk", // 현재 Kpop 남자아이돌 최고의 비주얼은 누구?
  "smUot8Uqtr36SDCLohd4", // 월드컵특집- 지난 10년간 최고의 전설적인 축구선수는 누구?
];

export const HIDE_IDS = [...HIDE_SEED_IDS, ...HIDE_NO_DEADLINE_IDS];

/**
 * 0단계 테스트가 남긴 익명 uid — **데이터로 증명된 1개만.**
 *
 * `tournament_runs`·`guest_runs` 는 PR 1이 만든 컬렉션이라, 그 문서를 가진 익명 계정은
 * PR 1 배포(09-06) 이후에 만들어진 것이다. 나머지 익명 계정 7개에는 그 표시가 없어
 * 0단계 테스트인지 실제 게스트 팬인지 **데이터로 구분되지 않는다.**
 *
 * 넓게 지우지 않는 이유는 청소 취향이 아니다: 옛 익명 계정의 `votes` 를 지우면 그 선택이
 * 랭킹 집계에서 **소급으로** 빠져 v2.1의 "게스트의 선택 랭킹 제외는 앞으로만, 소급 없음"
 * (2026-09-07 대표 확정)과 정면으로 충돌한다. 삭제가 곧 소급 적용이 된다.
 */
export const TEST_ANON_UIDS = ["jRNDqdI6oJRWuFV9zwrmTdoy3MF2"];

/**
 * 절대 건드리면 안 되는 uid — 대표님의 실제 Google 계정 (votes 462 · crown_cards 8).
 * 이 계정도 `tournament_runs` 문서를 가지고 있어서, "tournament_runs 를 가진 uid"라는
 * 식별 규칙을 코드로 자동화하면 여기까지 딸려온다. 그래서 삭제 대상은 자동 판별이 아니라
 * 위의 명시 목록이고, 실행기는 이 목록과 교집합이 있으면 멈춘다.
 */
export const PROTECTED_UIDS = ["89dvYo8s5ia2SywMiVR6ZGhn6Ex2"];

/** 그 uid의 기록을 지울 컬렉션. `votes` 는 필드 조회, 나머지는 문서 id 접두사 조회. */
export const TEST_DATA_COLLECTIONS = [
  "votes",
  "roundProgress",
  "tournament_runs",
  "guest_runs",
  "crown_cards",
];

/**
 * 계획을 만든다 — 어떤 문서에 무엇을 쓸지의 전부. 실행기는 이 목록을 옮겨 적기만 한다.
 *
 * `deadlineMs` 를 주입받는다(내부에서 Date를 파싱하지 않는다) — 그래야 계획이 결정적이고
 * 테스트가 시계에 흔들리지 않는다. 판·마감 판정에서 쓰는 것과 같은 원칙이다.
 */
export function planTournamentCleanup({ deadlineMs }) {
  if (!Number.isFinite(deadlineMs)) {
    throw new Error("planTournamentCleanup: deadlineMs(숫자)가 필요합니다.");
  }
  const extend = EXTEND_IDS.map((id) => ({
    id,
    op: "extend",
    patch: { tournamentDeadline: deadlineMs },
  }));
  const hide = HIDE_IDS.map((id) => ({
    id,
    op: "hide",
    patch: { status: HIDDEN_STATUS },
  }));
  return [...extend, ...hide];
}

/** 같은 문서가 두 번 나오면 계획이 자기모순이다 — 실행 전에 터뜨린다. */
export function assertPlanIsSound(plan) {
  const seen = new Set();
  for (const step of plan) {
    if (seen.has(step.id)) {
      throw new Error(`계획에 중복된 Tournament id가 있습니다: ${step.id}`);
    }
    seen.add(step.id);
  }
  return plan;
}

/** 사람이 읽는 한 줄. */
export function describeStep(step) {
  return step.op === "extend"
    ? `연장  ${step.id} → tournamentDeadline = ${EXTENDED_DEADLINE_KST}`
    : `숨김  ${step.id} → status = ${HIDDEN_STATUS}`;
}
