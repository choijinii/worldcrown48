/**
 * NEWS-1 · TIO 기본 지식 다섯 층 (결정 G · H · 대표 2026-11-27).
 *
 * 1층 사실표는 지시서 §12 의 35줄을 글자 그대로 — 아래 FACTS 가 그 사본이다. 한 글자라도 바뀌면 빨강.
 * 층마다 글자 수 상한(1층 6,000 · 2층 3,000 · 3층 장마다 3,000)도 이 시험이 막는다.
 */
import { describe, expect, it } from "vitest";
import {
  EXTRA_WAR_WORDS,
  TIO_FACT_SHEET,
  TIO_FORBIDDEN_WORDS,
  TIO_KIND_SKILLS,
  TIO_LAYER_LIMITS,
  TIO_STYLE_SKILL,
  buildTioPrompt,
  policyLinesFor,
  type NewsPolicyLine,
} from "../core/tioKnowledge";
import { FORBIDDEN_WAR_WORDS, NEWS_STYLE_GUIDE } from "../core/newsPrompts";

const FACTS = [
  "1. WorldCrown48(월크48)은 팬이 좋아하는 엔트리를 고르는 글로벌 웹 서비스다. 방식은 이상형 월드컵이다.",
  "2. 우승을 맞히는 예측 · 베팅 서비스가 아니다. 실제 경기 · 시상식 결과와 연결되지 않는다.",
  "3. 모바일 앱은 없다. 웹으로만 쓴다. 화면은 한국어 · 영어 · 스페인어 3언어다.",
  "4. 지금 열려 있는 카테고리는 K-POP · CREATOR다. 카테고리는 차례로 늘어난다(K-DRAMA 등). 축구 카테고리는 없다.",
  '5. 대회는 지금 월크48 운영자가 만든다. 팬이 대회를 직접 만드는 기능은 아직 없다(화면의 Create Tournament는 "COMING SOON").',
  '6. 뉴스는 뉴스 AI TIO가 초안을 쓰고, 뉴스데스크가 검수해 발행한다. 서명 = "TIOZ 작성 · WorldCrown48 뉴스데스크 검수".',
  "7. 대회(Tournament) 하나에는 엔트리 48개가 있다. 엔트리는 사람 한 명일 수도, 팀(그룹) 하나일 수도 있다.",
  "8. 대회 종류는 둘이다: 영상 대회(엔트리마다 유튜브 영상) · 이미지 대회(엔트리마다 그림).",
  "9. 진행: ROUND OF 48(Match 24개) → ROUND OF 24(Match 12개) → ROUND OF 12(Match 6개) → ROUND OF 6(Match 3개) → THE FINAL.",
  "10. Match는 엔트리 둘 가운데 하나를 고르는 순간이다. THE FINAL만 엔트리 셋을 한꺼번에 보여 주고 그중 하나를 고른다.",
  "11. 한 판에 고르는 횟수는 모두 46번이다(24 + 12 + 6 + 3 + 결승 1).",
  "12. Match는 한 번에 하나씩 순서대로 나온다. 건너뛰거나 골라서 할 수 없다.",
  "13. 라운드에는 기한이 없다. 기한은 대회 전체의 마감 하나뿐이다.",
  "14. 쓰지 않는 라운드 이름: ROUND OF 16 · QUARTERFINAL · SEMIFINAL · 16강 · 8강 · 4강.",
  "15. 결승에서 고른 엔트리가 그 판의 Champion이다. Champion이 정해지면 크라운 카드(Crown Card)가 만들어지고, 팬은 그것을 SNS로 공유한다.",
  '16. 대진(누가 누구와 만나는지)은 판마다 새로 섞인다. 그래서 "1라운드 대진표"처럼 정해진 대진은 없다.',
  '17. 한 팬이 한 대회를 48강부터 결승까지 마치는 것이 "한 판"이다. 참여는 판으로 센다.',
  "18. 로그인한 팬은 대회마다 하루(KST) 5판까지. 게스트(로그인 안 한 팬)는 모든 대회를 합쳐 하루 3판까지.",
  "19. 게스트의 선택은 차트에 들어가지 않는다. 게스트도 크라운 카드를 공유할 수 있지만, 저장은 로그인해야 한다.",
  "20. 대회마다 차트(Chart)가 있다. 차트는 마감 전에도, 로그인하지 않아도 볼 수 있다.",
  "21. 차트에 나오는 숫자는 Crown Score(0~1000의 정수) 하나다. 대회 전체에서 끝까지 마친 판이 10판이 되기 전에는 점수를 보이지 않는다.",
  "22. Crown Score는 팬의 선택만으로 만든다. 빌보드 등 바깥 차트 숫자는 섞지 않는다. 바깥 차트는 기사에서 인용만 한다.",
  '23. 기사에 쓸 수 있는 숫자: 엔트리 수 · 마감 날짜 · 지원 언어 · 카테고리 · 대회 종류 · 진행 중인 대회 수 · 순위 · Crown Score · 순위 변동 · Crown Score 변동 · 1위를 지킨 기간 · 참여 팬 수 · 대회 전체 참여 횟수("참여"로 씀) · 순위를 정하는 세 비율(정본 이름: 선택율 · 순위점수율 · 우승율 — 순위점수율은 필요하면 설명을 붙인다) · 순위와 관계없는 비율(외신 인용 등).',
  "24. 기사에 쓰지 않는 것: 선택 수(몇 번 골렸는지) · 득표수 · 1등 횟수 · 결승에 오른 횟수 · Match에 나온 횟수 · 세 비율을 정본이 아닌 이름(선택 비율 · 점유율 · 승률 · 득표율 · 1등 비율 등)으로 쓰는 것 · 세 비율이 아닌 비율을 순위나 Crown Score를 정하거나 영향을 주는 것처럼 쓰는 것.",
  '25. Crown Score는 "얻었다"가 아니라 "기록했다"로 쓴다.',
  "26. The Pitch = 홈 · The Arena = 대회를 하는 곳 · The Lab = 운영자가 대회를 만드는 곳 · Record Room = 기록실(Charts · Hall of Fame 자리) · Newsroom = 뉴스 · Locker Room = 내 계정.",
  "27. 우승 장면을 보여 주는 별도 연출(시상식 장면)은 없다. 우승의 기쁨은 크라운 카드가 맡는다.",
  '28. 영문 원형으로 쓰는 고유명사: WorldCrown48 · Tournament · Contestant · Match · Champion · Crown Card · Crown Score · THE FINAL · ROUND OF 48 등. "토너먼트 · 컨테스턴트 · 매치 · 월드크라운"으로 음차하지 않는다.',
  '29. 고르는 사람은 "팬"(en · es: fan / fans), 고르는 행위는 "선택", 고르는 대상은 "엔트리"라고 쓴다.',
  '30. 쓰지 않는 말: 표 · 투표 · 득표 · 득표율 · 참가자 · 후보자 · 48명 · 경기 · 배틀 · FIFA · Official · 월드컵(서비스 방식 설명 "이상형 월드컵"만 예외) · 예측 · 배당.',
  "31. 전투 은유를 쓰지 않는다: 전쟁 · 격돌 · 혈투 · 앙숙 · 생존 · 왕좌 · 잔인한 등. Match는 싸움이 아니라 더 사랑하는 쪽을 고르는 순간이다.",
  '32. 사용 설명("참여는 무료", "~하면 시작됩니다")을 쓰지 않는다.',
  "33. 확인하지 않은 사실 · 소문 · 추측을 쓰지 않는다. 데이터에 없는 숫자를 만들지 않는다.",
  "34. 사생활(열애 · 결혼 · 이혼 · 건강 · 가족)을 기사의 주제로 고르지 않는다. 본인이 공개 발표한 사실을 배경으로 한두 문장 쓰는 것은 된다.",
  "35. 시험 대회(이름에 E2E 등)는 기사로 쓰지 않는다.",
];

const policy: NewsPolicyLine[] = [
  { text: "모든 기사 줄", reason: "공통", addedAt: "2026-11-27" },
  { text: "주간에만 쓰는 줄", reason: "주간", addedAt: "2026-11-27", kinds: ["weekly"] },
  { text: "개막에만 쓰는 줄", reason: "개막", addedAt: "2026-11-27", kinds: ["open"] },
];

describe("1층 사실표", () => {
  it("§12 35줄이 글자 그대로 · 순서대로 들어 있다", () => {
    expect(FACTS).toHaveLength(35);
    const lines = TIO_FACT_SHEET.split("\n");
    let at = -1;
    for (const f of FACTS) {
      const i = lines.indexOf(f);
      expect(i, f).toBeGreaterThan(at);
      at = i;
    }
    // 번호 줄은 정확히 35개 — 덧붙인 사실이 없다
    expect(lines.filter((l) => /^\d+\. /.test(l))).toEqual(FACTS);
  });
});

describe("층마다 상한(결정 H)", () => {
  it("1층 ≤ 6,000자 · 2층 ≤ 3,000자 · 3층 장마다 ≤ 3,000자", () => {
    expect(TIO_LAYER_LIMITS).toEqual({ facts: 6000, style: 3000, kind: 3000, policyLines: 30, policyChars: 200 });
    expect(TIO_FACT_SHEET.length).toBeLessThanOrEqual(TIO_LAYER_LIMITS.facts);
    expect(TIO_STYLE_SKILL.length).toBeLessThanOrEqual(TIO_LAYER_LIMITS.style);
    for (const [kind, s] of Object.entries(TIO_KIND_SKILLS)) {
      expect(s.length, kind).toBeLessThanOrEqual(TIO_LAYER_LIMITS.kind);
    }
  });
});

describe("2층 문체 스킬", () => {
  it("옛 7개 지침 · 기사 뼈대 · 넓힌 금지 낱말 · 전투 은유 8개 + 전쟁", () => {
    expect(NEWS_STYLE_GUIDE).toBe(TIO_STYLE_SKILL);
    for (const marker of ["1. 사용설명 금지", "2. 훅 필수", "3. 비주얼 병행", "4. 마무리는", "5. 축제의 언어", "6. LANGUAGE.md", "7. 킥 비트"]) {
      expect(TIO_STYLE_SKILL).toContain(marker);
    }
    expect(TIO_STYLE_SKILL).toContain("기사 뼈대 = 앞 훅(lead) · 가운데 데이터(stats · matchups · paragraph) · 뒤 킥(closer 직전 반전 한 줄)");
    for (const w of [...TIO_FORBIDDEN_WORDS, ...FORBIDDEN_WAR_WORDS, ...EXTRA_WAR_WORDS]) {
      expect(TIO_STYLE_SKILL, w).toContain(w);
    }
    // 외신 지시문이 import 하는 8개 목록은 그대로
    expect(FORBIDDEN_WAR_WORDS).toEqual(["잔인한", "앙숙", "격돌", "혈투", "생존", "왕좌", "전력을 꺼내다", "피해 갈 곳 없다"]);
    expect(EXTRA_WAR_WORDS).toContain("전쟁");
    expect(TIO_FORBIDDEN_WORDS).toEqual(["표", "투표", "득표", "득표율", "참가자", "후보자", "48명", "경기", "배틀", "FIFA", "Official", "월드컵", "예측", "배당"]);
  });
});

describe("3층 종류별 스킬", () => {
  it("다섯 장 — 외신은 자리만(빈 글)", () => {
    expect(Object.keys(TIO_KIND_SKILLS).sort()).toEqual(["column", "open", "press", "result", "weekly"]);
    expect(TIO_KIND_SKILLS.press).toBe("");
    expect(TIO_KIND_SKILLS.open).toContain("첫 라운드의 설레는 만남을 matchups 블록으로");
    expect(TIO_KIND_SKILLS.weekly).toContain("Crown Score 순위로 소개");
    expect(TIO_KIND_SKILLS.column).toContain("축제의 언어를 담은 칼럼");
    expect(TIO_KIND_SKILLS.result).toContain("팬들이 함께 고른 결과를 전한다");
  });
});

describe("4층 편집 방침 줄 고르기", () => {
  it("kinds 가 비면 전체 · 있으면 그 종류만", () => {
    expect(policyLinesFor(policy, "weekly").map((l) => l.text)).toEqual(["모든 기사 줄", "주간에만 쓰는 줄"]);
    expect(policyLinesFor(policy, "result").map((l) => l.text)).toEqual(["모든 기사 줄"]);
  });
});

describe("조립 순서 1 → 2 → 3 → 4 → 할 일 → 데이터 → 출력 모양", () => {
  it("주간 — 해당 종류 장 · 해당 줄만", () => {
    const p = buildTioPrompt({ kind: "weekly", task: "[할 일]", policyLines: policy, data: "[데이터]" });
    const order = [TIO_FACT_SHEET, TIO_STYLE_SKILL, TIO_KIND_SKILLS.weekly, "주간에만 쓰는 줄", "[할 일]", "[데이터]", "출력은 JSON 객체 하나로만"];
    let at = -1;
    for (const piece of order) {
      const i = p.indexOf(piece);
      expect(i, piece.slice(0, 20)).toBeGreaterThan(at);
      at = i;
    }
    expect(p.startsWith(TIO_FACT_SHEET)).toBe(true);
    expect(p).toContain("모든 기사 줄");
    expect(p).not.toContain("개막에만 쓰는 줄");
    expect(p).not.toContain(TIO_KIND_SKILLS.open);
  });

  it("편집 방침이 없으면 그 칸을 통째로 뺀다", () => {
    const p = buildTioPrompt({ kind: "open", task: "[할 일]", policyLines: [], data: "[데이터]" });
    expect(p).not.toContain("TIOZ 편집 방침");
  });
});

describe("세 비율 이름(D-108)", () => {
  it("세 비율 정본 이름(대표 2026-11-28) — 선택율 · 우승율 · 순위점수율 · en · es 는 지금 글자 그대로", async () => {
    const { CHART_RATE_TERMS } = await import("../core/displayTerms");
    expect(CHART_RATE_TERMS).toEqual({
      place: { ko: "순위점수율", en: "Reach", es: "Alcance" },
      win: { ko: "우승율", en: "Wins", es: "Victorias" },
      pick: { ko: "선택율", en: "Picks", es: "Elecciones" },
    });
  });
  it("비정본 이름(선택 비율 · 점유율 · 승률 · 1등 비율)은 '쓰지 않는다' 줄에만 — 사실표 24번 · 문체 금지 줄", () => {
    for (const kind of ["open", "result", "weekly", "column"] as const) {
      const p = buildTioPrompt({ kind, task: "t", policyLines: [], data: "d" });
      const lines = p.split("\n").filter((l) => /선택 비율|점유율|승률|1등 비율/.test(l));
      expect(lines.length).toBeGreaterThan(0);
      for (const l of lines) expect(l, l).toMatch(/쓰지 않는/);
    }
  });
  it("순위점수율 설명 줄 — CROWN_SCORE_v1.1.md 정의를 따라 한 문장", () => {
    expect(TIO_STYLE_SKILL).toContain("순위점수율을 쓸 때 설명이 필요하면 marketing/00_strategy/CROWN_SCORE_v1.1.md 의 정의를 따라 한 문장으로 붙인다");
    expect(TIO_STYLE_SKILL).toContain("(받은 순위 점수 합계 ÷ 대회 전체 판수) ÷ 10");
  });
});
