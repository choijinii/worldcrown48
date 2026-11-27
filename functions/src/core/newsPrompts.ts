/**
 * newsPrompts — 개막 · 결과 · 주간 · 칼럼 초안의 지시문 (ND-1 §3 #3 · NEWS-1 다섯 층).
 *
 * 층(사실표 · 문체 · 종류별 스킬 · 편집 방침)은 tioKnowledge.ts 한 곳에 있다. 이 파일은 데이터(근거 줄)와
 * 그때그때 값이 든 할 일 줄만 만들고 buildTioPrompt 로 조립한다.
 *
 * Output contract (must match lib/news/articleDoc.ts block model):
 *   { title, subhead, body: Block[] }  where Block ∈
 *     hero{kicker,title,subtitle} · lead{text} · paragraph{text}
 *     stats{items:[{n,l}]} · matchups{pairs:[{left:{group,title},right:{...}}],note}
 *     closer{text}
 */
import { chartScoresShown, type NewsDigest } from "./newsDigestCore";
import { CHART_RATE_TERMS } from "./displayTerms";
import { buildTioPrompt, type NewsKind, type NewsPolicyLine } from "./tioKnowledge";

// 옛 이름 그대로 내보낸다 — 외신 지시문(pressPrompt.ts) · 시험이 여기서 import 한다.
export {
  CHART_TERM_RULE_LINE,
  FORBIDDEN_WAR_WORDS,
  NUMBER_RULE_LINES,
  TIO_STYLE_SKILL as NEWS_STYLE_GUIDE,
} from "./tioKnowledge";

/**
 * 차트가 아직 점수를 감추는 동안(runsTotal 10 미만 · 모름) AI 재료에 싣는 한 줄.
 * 차트 화면은 그동안 목록 자체를 감추므로(`lib/ranking/rankState.ts` → waiting) 순위도 쓰지 않는다
 * (최종 검토 I-2).
 */
export const CHART_WAITING_LINE =
  "차트는 아직 참여가 적어 순위와 점수를 공개하지 않는다 — 순위 · Crown Score · 비율을 쓰지 않는다.";

/**
 * NAME-I18N-1 (원장 D-61) — 한글 이름 옆에 공식 영어 이름을 덧붙인다. en·es 기사가
 * 발음 옮겨 적기 대신 공식 철자를 쓰게 하는 근거 데이터다(지침·구조는 그대로).
 * 영어 이름이 없거나 한글 이름과 같으면 아무것도 붙이지 않는다 — 지금 줄 그대로.
 */
function englishNameNote(name: string, nameEn?: string): string {
  return nameEn && nameEn !== name ? ` (공식 영어 이름: ${nameEn})` : "";
}

/** 0~1 비율 → 소수 첫째 자리 퍼센트 글자("31.0"). */
function pct(r: number): string {
  return (r * 100).toFixed(1);
}

/**
 * AI 재료 — 근거 숫자 칸 + 선두(차트 순위 · Crown Score · 1등 비율 · 점유율) +
 * 결과 기사만 대회 전체 참여 횟수. 두 비율은 Crown Score 와 같은 줄에만 싣는다.
 */
export function evidenceLines(digest: NewsDigest): string {
  const stats = digest.stats
    .map((s) => `  - ${s.label}: ${s.value}`)
    .join("\n");
  const leaders =
    digest.leaders.length > 0
      ? (digest.scoresWaiting
          ? "\n선두(이름만 — 순위는 아직 공개 전):\n"
          : `\n선두(차트 순위 · Crown Score · ${CHART_RATE_TERMS.win.ko} · ${CHART_RATE_TERMS.pick.ko}):\n`) +
        digest.leaders
          .map(
            (l) =>
              // 점수를 감추는 동안은 "N위" 도 싣지 않는다 — 차트가 목록을 감추고, runsTotal 0 이면
              // 점수가 전부 0 이라 모두 "1위" 가 된다(최종 검토 I-2).
              `  - ${digest.scoresWaiting ? "" : `${l.rank}위 `}${l.name}${englishNameNote(l.name, l.nameEn)}` +
              (l.crownScore !== undefined
                ? ` Crown Score ${l.crownScore} · ${CHART_RATE_TERMS.win.ko} ${pct(l.winRate ?? 0)}% · ${CHART_RATE_TERMS.pick.ko} ${pct(l.shareRate ?? 0)}%`
                : "") +
              (l.isChampion ? " (Champion)" : "") +
              (l.tournamentTitle ? ` [${l.tournamentTitle}]` : ""),
          )
          .join("\n")
      : "";
  const runs =
    digest.runsTotal !== undefined ? `\n대회 전체 참여 횟수: ${digest.runsTotal}` : "";
  const waiting = digest.scoresWaiting ? `\n${CHART_WAITING_LINE}` : "";
  return `근거 데이터 (기준시각 ${digest.asOf}):\n${stats}${leaders}${waiting}${runs}`;
}

/** 4층 편집 방침 줄 — 없으면 빈 목록(지금 지시문 그대로). */
type Policy = { policyLines?: readonly NewsPolicyLine[] };

function assemble(kind: NewsKind, task: string, digest: NewsDigest, policy: Policy): string {
  return buildTioPrompt({ kind, task, policyLines: policy.policyLines ?? [], data: evidenceLines(digest) });
}

export function buildOpenPrompt(args: { title: string; category: string; digest: NewsDigest } & Policy): string {
  return assemble("open", `[오픈 기사] Tournament "${args.title}" (카테고리 ${args.category})가 방금 개막했다.`, args.digest, args);
}

export function buildResultPrompt(
  args: {
    title: string;
    championName: string;
    /** 공식 영어 이름(NAME-I18N-1) — 없으면 지금 문장 그대로. */
    championNameEn?: string;
    digest: NewsDigest;
  } & Policy,
): string {
  const en =
    args.championNameEn && args.championNameEn !== args.championName
      ? `(공식 영어 이름 "${args.championNameEn}")`
      : "";
  // 결과 기사는 대회의 첫 Champion 확정 직후 만들어져 대개 10판 미만이다 — 그때는 차트처럼
  // 순위 · 점수를 말하지 않는다(최종 검토 I-2). 선두가 없어도 runsTotal 로 판정한다.
  const waiting = args.digest.scoresWaiting === true || !chartScoresShown(args.digest.runsTotal);
  const tail = waiting
    ? "차트는 아직 참여가 적어 순위와 점수를 쓰지 않는다."
    : "상위 순위를 Crown Score 순위로 전한다.";
  return assemble(
    "result",
    `[결과 기사] Tournament "${args.title}"가 끝났고 Champion은 "${args.championName}"${en}이다. ` + tail,
    args.digest,
    args,
  );
}

export function buildWeeklyPrompt(args: { digest: NewsDigest } & Policy): string {
  return assemble("weekly", "[주간 랭킹 동향] 아래 근거 데이터로 이번 주 기사를 쓴다.", args.digest, args);
}

export function buildColumnPrompt(args: { topic: string; digest: NewsDigest } & Policy): string {
  return assemble("column", `[자유 칼럼] 주제: "${args.topic}".`, args.digest, args);
}
