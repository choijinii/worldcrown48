/**
 * newsPrompts — the 4 article-template system prompts (ND-1 §3 #3, AC 9).
 *
 * §5.5 작성 지침 6항 + 전투 은유 금지어는 4종 프롬프트 전부에 시스템 프롬프트로 그대로
 * 박제된다 (NEWS_STYLE_GUIDE single source). The model returns a structured block
 * JSON — 지면 디자인은 렌더러 몫, 프롬프트는 제목·부제·본문·수치 텍스트까지만.
 *
 * Output contract (must match lib/news/articleDoc.ts block model):
 *   { title, subhead, body: Block[] }  where Block ∈
 *     hero{kicker,title,subtitle} · lead{text} · paragraph{text}
 *     stats{items:[{n,l}]} · matchups{pairs:[{left:{group,title},right:{...}}],note}
 *     closer{text}
 */
import type { NewsDigest } from "./newsDigestCore";
import { UNTRANSLATABLE_PROPER_NOUNS } from "./displayTerms";

/** 전투 은유 금지어 — §5.5 #5. Match 는 싸움이 아니라 애정을 고르는 순간. */
export const FORBIDDEN_WAR_WORDS = [
  "잔인한",
  "앙숙",
  "격돌",
  "혈투",
  "생존",
  "왕좌",
  "전력을 꺼내다",
  "피해 갈 곳 없다",
] as const;

const OUTPUT_SPEC = [
  "출력은 JSON 객체 하나로만:",
  '{ "title": string, "subhead": string, "blocks": Block[] }',
  "Block 종류(type):",
  '- hero: { "type":"hero", "kicker":string, "title":string, "subtitle":string }',
  '- lead: { "type":"lead", "text":string }  (드롭캡 첫 문단)',
  '- paragraph: { "type":"paragraph", "text":string }',
  '- stats: { "type":"stats", "items":[{ "n":string, "l":string }] }  (n=수치, l=라벨)',
  '- matchups: { "type":"matchups", "pairs":[{ "left":{ "group":string,"title":string }, "right":{ "group":string,"title":string } }], "note":string }',
  '- closer: { "type":"closer", "text":string }',
  "규칙: 수치(stats.n)와 고유명사(matchups group/title)는 원문 데이터 그대로. JSON 외 텍스트 금지.",
].join("\n");

/**
 * §5.5 지침 7항 — 4종 프롬프트 전부에 박제되는 단일 진실. 마커 문구(사용설명 금지 /
 * 훅 필수 / 비주얼 병행 / 정서적 클로저 / 축제의 언어 / Vote Count / 킥 비트 / 표시 용어)는
 * AC 9 존재검증의 계약 표면이므로 변경 시 newsPrompts.test.ts 동시 갱신.
 *
 * 지침 6 표시 용어 층 (2026-08-06 대표 확정, LANGUAGE.md §1): 코드·DB의 `Voter`는 불변이고
 * 독자에게 보이는 지칭만 팬/Fan 이다. 기사는 전부 독자 대상 텍스트이므로 본문에 "Voter"가
 * 나오면 안 된다 — 그래서 금지 지시로만 그 단어를 남긴다.
 *
 * ⚠️ 지침 6이 §10 번역 불가 목록을 먼저 못박는 이유 (2026-08-08 실측 회귀): "독자에게 보이는
 * 곳에 Voter를 쓰지 마라"만 있으면 모델이 이를 "영문 용어를 피하라"로 일반화해 Tournament를
 * "토너먼트", WorldCrown48을 "월드크라운"으로 음차했다. 배포 직후 생성한 초안에서 Tournament
 * 0회 / 토너먼트 3회가 관측됐다 (직전 weekly 초안들은 전부 영문 Tournament 유지). 그래서
 * 고유명사 보존을 지칭 규칙보다 앞에 두고, 표시 용어 교체 범위를 "지칭에 한해"로 좁혔다.
 */
export const NEWS_STYLE_GUIDE = [
  "당신은 WorldCrown48 뉴스룸의 기자다. 다음 7개 지침을 절대 어기지 않는다.",
  "",
  '1. 사용설명 금지 — "참여는 무료", "~하면 시작됩니다" 류 안내문을 쓰지 않는다.',
  "2. 훅 필수 — 리드에 호기심을 자극(긴장·장면·질문). 설명형 리드 금지.",
  "3. 비주얼 병행 — 서술만으로 부족하다. stats(스탯 타일)·matchups(매치업 VS) 블록을 데이터로 출력한다.",
  "4. 마무리는 매뉴얼이 아니라 정서적 클로저 한 줄(closer 블록)로 닫는다.",
  "5. 축제의 언어 — 전투 은유 금지. 다음 단어를 절대 쓰지 않는다: " +
    FORBIDDEN_WAR_WORDS.join(" · ") +
    ".",
  '   매치는 싸움이 아니라 "어느 쪽을 더 사랑하는지 고르는 순간". 애정·자랑·발견·설렘의 언어를 쓴다.',
  '   변환 예: "잔인한 대진"→"눈을 뗄 수 없는 만남" · "앙숙"→"나란히 차트를 달군 두 곡".',
  "6. LANGUAGE.md 공식 용어 준수. 고유명사는 모든 언어에서 영문 원형 그대로 쓴다 —",
  // 번역 프롬프트와 같은 목록을 쓴다 — 두 곳에 손으로 적어두면 갈라진다.
  `   ${UNTRANSLATABLE_PROPER_NOUNS.join(" · ")}.`,
  '   한글 음차 금지: "토너먼트"·"컨테스턴트"·"매치"·"월드크라운"으로 바꿔 쓰지 않는다.',
  '   단, 참여자를 부르는 지칭만은 표시 용어를 쓴다 — "팬"(ko) / "fan(s)"(en·es).',
  '   지칭에 한해 "Voter"라고 쓰지 않는다 — 위 고유명사 목록과 혼동하지 말 것.',
  "   절대 득표수(Vote Count)는 어떤 기사에도 쓰지 않는다 — 비율·순위·참여 팬 수(Fan Count)만 쓴다.",
  "7. 킥 비트 1개 필수 — 클로저 직전에 예상을 비트는 반전, 앞 문장을 되받는 복기(콜백), 또는",
  "   데이터가 말해주는 의외의 강조 중 하나를 넣는다. 평탄하게 클로저로 직행하지 않는다.",
].join("\n");

function evidenceLines(digest: NewsDigest): string {
  const stats = digest.stats
    .map((s) => `  - ${s.label}: ${s.value}`)
    .join("\n");
  const leaders =
    digest.leaders.length > 0
      ? "\n선두(순위·비율):\n" +
        digest.leaders
          .map(
            (l) =>
              `  - ${l.rank}위 ${l.name} ${l.rate.toFixed(1)}%` +
              (l.isChampion ? " (Champion)" : "") +
              (l.tournamentTitle ? ` [${l.tournamentTitle}]` : ""),
          )
          .join("\n")
      : "";
  return `근거 데이터 (기준시각 ${digest.asOf}):\n${stats}${leaders}`;
}

function assemble(taskLine: string, digest: NewsDigest): string {
  return [
    NEWS_STYLE_GUIDE,
    "",
    taskLine,
    "",
    evidenceLines(digest),
    "",
    OUTPUT_SPEC,
  ].join("\n");
}

export function buildOpenPrompt(args: {
  title: string;
  category: string;
  digest: NewsDigest;
}): string {
  return assemble(
    `[오픈 기사] Tournament "${args.title}" (카테고리 ${args.category})가 방금 개막했다. ` +
      `개막을 알리는 기사를 쓴다. 첫 라운드의 설레는 만남을 matchups 블록으로, 규모·마감·언어를 stats 블록으로 보여준다.`,
    args.digest,
  );
}

export function buildResultPrompt(args: {
  title: string;
  championName: string;
  digest: NewsDigest;
}): string {
  return assemble(
    `[결과 기사] Tournament "${args.title}"가 끝났고 Champion은 "${args.championName}"이다. ` +
      `팬들이 함께 고른 결과를 전한다. 상위 순위를 비율(%)로 stats 블록에 담되 절대 득표수는 쓰지 않는다.`,
    args.digest,
  );
}

export function buildWeeklyPrompt(args: { digest: NewsDigest }): string {
  return assemble(
    `[주간 랭킹 동향] 이번 주 진행 중인 Tournament들의 흐름을 정리한다. ` +
      `주목받는 Contestant를 비율(%)로 소개하고, 이번 주의 발견을 정서적 클로저로 닫는다.`,
    args.digest,
  );
}

export function buildColumnPrompt(args: {
  topic: string;
  digest: NewsDigest;
}): string {
  return assemble(
    `[자유 칼럼] 주제: "${args.topic}". 이 주제로 축제의 언어를 담은 칼럼을 쓴다. ` +
      `근거 데이터가 있으면 stats 블록으로 곁들이고, 없으면 장면과 질문으로 연다.`,
    args.digest,
  );
}
