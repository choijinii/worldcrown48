/**
 * backfill-news-display-term — rule tests pinned against PRODUCTION text.
 *
 * Every string in the "실제 발행 기사" blocks below was harvested from the three live
 * articles on 2026-08-08 (ko·en·es × 20260726-6c93cc · 20260726-3fb980 · 20260730-ca4f8c).
 * The backfill cannot be rehearsed against prod without the service-account key, so
 * these tests ARE the rehearsal: if the rules mangle production text, they fail here.
 */
import { describe, it, expect } from "vitest";
import {
  replaceDisplayTerm,
  findResidue,
  planArticleBackfill,
  summarize,
} from "../../scripts/backfill-news-display-term.lib.mjs";

describe("ko — 조사 correction (팬 is consonant-final, Voter is not)", () => {
  it("rewrites the particle that a naive swap would break", () => {
    // The column article's only hit — "팬가" would be ungrammatical.
    expect(replaceDisplayTerm("수백만의 Voter가 만드는 플레이리스트", "ko")).toBe(
      "수백만의 팬이 만드는 플레이리스트",
    );
    expect(replaceDisplayTerm("Voter는", "ko")).toBe("팬은");
    expect(replaceDisplayTerm("Voter를", "ko")).toBe("팬을");
    expect(replaceDisplayTerm("Voter로", "ko")).toBe("팬으로");
  });

  it("keeps 들 attached and leaves the following 조사 alone", () => {
    expect(replaceDisplayTerm("Voter들의 선택이", "ko")).toBe("팬들의 선택이");
    expect(replaceDisplayTerm("Voter들이 새로운 애정을", "ko")).toBe("팬들이 새로운 애정을");
    expect(replaceDisplayTerm("Voter들 사이에서", "ko")).toBe("팬들 사이에서");
  });

  it("handles a bare Voter followed by a space", () => {
    expect(replaceDisplayTerm("Voter 한 명 한 명의 마음", "ko")).toBe(
      "팬 한 명 한 명의 마음",
    );
  });

  it("converts the 지표 표기 before the bare rule can shred it", () => {
    expect(replaceDisplayTerm("Voter Count 기준", "ko")).toBe("참여 팬 수 기준");
  });
});

describe("en — prose is lowercase, title-cased slots keep the capital", () => {
  it("lowercases in body prose", () => {
    expect(replaceDisplayTerm("each individual Voter", "en", "paragraph.text")).toBe(
      "each individual fan",
    );
    expect(replaceDisplayTerm("among Voters", "en", "paragraph.text")).toBe("among fans");
    expect(
      replaceDisplayTerm("as voters across the nation", "en", "lead.text"),
    ).toBe("as fans across the nation");
  });

  it("keeps possessives intact", () => {
    expect(
      replaceDisplayTerm("a record of Voters' unpredictable love", "en", "closer.text"),
    ).toBe("a record of fans' unpredictable love");
    expect(
      replaceDisplayTerm("where the Voters' hearts are directing", "en", "lead.text"),
    ).toBe("where the fans' hearts are directing");
  });

  it("uses Title Case in title/subhead/hero slots", () => {
    expect(
      replaceDisplayTerm("Voter Choices Converge Amid Notable Upward Momentum", "en", "subhead"),
    ).toBe("Fan Choices Converge Amid Notable Upward Momentum");
    expect(
      replaceDisplayTerm(
        "A Moment When Voters' Choices Converge on a Single Contestant",
        "en",
        "subhead",
      ),
    ).toBe("A Moment When Fans' Choices Converge on a Single Contestant");
    expect(
      replaceDisplayTerm("Stories of Voters Making the Decision to Love Someone", "en", "hero.subtitle"),
    ).toBe("Stories of Fans Making the Decision to Love Someone");
  });

  it("capitalizes when the term opens a sentence in prose", () => {
    expect(replaceDisplayTerm("Voters choose freely.", "en", "paragraph.text")).toBe(
      "Fans choose freely.",
    );
    expect(
      replaceDisplayTerm("It is rare. Voters decide together.", "en", "paragraph.text"),
    ).toBe("It is rare. Fans decide together.");
  });
});

describe("es — both the untranslated Voter and the translated votante are 지칭", () => {
  it("agrees in number after a plural determiner ('los Voter', not 'los fan')", () => {
    // The translator treated Voter as an invariant foreign noun; as a Spanish noun
    // it must agree with the article. This is the whole reason es has its own rules.
    expect(replaceDisplayTerm("el amor de los Voter", "es", "closer.text")).toBe(
      "el amor de los fans",
    );
    expect(
      replaceDisplayTerm("entre los Voter está surgiendo una onda", "es", "paragraph.text"),
    ).toBe("entre los fans está surgiendo una onda");
    expect(
      replaceDisplayTerm("las elecciones de los Voter reunidos", "es", "paragraph.text"),
    ).toBe("las elecciones de los fans reunidos");
  });

  it("stays singular after a singular determiner", () => {
    expect(replaceDisplayTerm("el corazón de cada Voter", "es", "paragraph.text")).toBe(
      "el corazón de cada fan",
    );
  });

  it("converts the untranslated plural", () => {
    expect(
      replaceDisplayTerm("millones de Voters que pasan la misma estación", "es", "paragraph.text"),
    ).toBe("millones de fans que pasan la misma estación");
  });

  it("converts the translated term", () => {
    expect(
      replaceDisplayTerm("los votantes de todo el país", "es", "lead.text"),
    ).toBe("los fans de todo el país");
    expect(
      replaceDisplayTerm("los votantes de todo el país", "es", "lead.text"),
    ).toBe("los fans de todo el país");
  });

  it("keeps sentence case in a subhead — Spanish headlines are not Title Case", () => {
    // "Los Fans" would be a capitalization error; English "Fan Choices" is correct.
    expect(
      replaceDisplayTerm("Los votantes se reúnen con un aumento notable", "es", "subhead"),
    ).toBe("Los fans se reúnen con un aumento notable");
  });
});

describe("idempotence — re-running the backfill is a no-op", () => {
  const samples: [string, "ko" | "en" | "es", string][] = [
    ["Voter들의 선택이", "ko", ""],
    ["수백만의 Voter가 만드는", "ko", ""],
    ["among Voters", "en", "paragraph.text"],
    ["Voter Choices Converge", "en", "subhead"],
    ["el amor de los Voter", "es", "closer.text"],
    ["los votantes de todo el país", "es", "lead.text"],
  ];

  for (const [text, lang, slot] of samples) {
    it(`${lang} "${text}" converges after one pass`, () => {
      const once = replaceDisplayTerm(text, lang, slot);
      expect(replaceDisplayTerm(once, lang, slot)).toBe(once);
      expect(findResidue(once, lang)).toEqual([]);
    });
  }
});

describe("findResidue — the abort signal for unenumerated forms", () => {
  it("is empty for converted text", () => {
    expect(findResidue("팬들의 선택이", "ko")).toEqual([]);
    expect(findResidue("among fans", "en")).toEqual([]);
    expect(findResidue("el amor de los fans", "es")).toEqual([]);
  });

  it("reports leftovers, including the es-only votante forms", () => {
    expect(findResidue("Voter 닉네임", "ko")).toEqual(["Voter"]);
    expect(findResidue("los votantes", "es")).toEqual(["votantes"]);
  });
});

describe("planArticleBackfill — never touches data fields", () => {
  const doc = () => ({
    id: "20260726-3fb980",
    status: "published",
    template: "weekly",
    title: { ko: "이번 주, 11개 Tournament가 품은 변화의 물결", en: "This Week", es: "Esta semana" },
    subhead: {
      ko: "눈에 띄는 상승세와 함께 Voter들의 선택이 모여지는 중",
      en: "Voter Choices Converge Amid Notable Upward Momentum",
      es: "Los votantes se reúnen con un aumento notable en las opciones",
    },
    body: {
      ko: [
        { type: "lead", text: "전국의 Voter들이 새로운 애정을 발견해내고 있는 중이다." },
        { type: "stats", items: [{ n: "10.9%", l: "TOP MOMENTUM" }] },
        {
          type: "matchups",
          pairs: [{ left: { group: "Voter", title: "Voter" }, right: { group: "A", title: "B" } }],
          note: "Voter들의 선택",
        },
        { type: "closer", text: "Voter들의 예측 불가능한 사랑의 기록" },
      ],
      en: [{ type: "paragraph", text: "the heart of each individual Voter" }],
      es: [{ type: "paragraph", text: "el corazón de cada Voter" }],
    },
  });

  it("rewrites prose across all three languages", () => {
    const d = doc();
    const plan = planArticleBackfill(d, { mutate: true });
    expect(d.subhead.ko).toBe("눈에 띄는 상승세와 함께 팬들의 선택이 모여지는 중");
    expect(d.subhead.en).toBe("Fan Choices Converge Amid Notable Upward Momentum");
    expect(d.subhead.es).toBe("Los fans se reúnen con un aumento notable en las opciones");
    expect(d.body.ko[0].text).toBe("전국의 팬들이 새로운 애정을 발견해내고 있는 중이다.");
    expect(d.body.ko[3].text).toBe("팬들의 예측 불가능한 사랑의 기록");
    expect(d.body.en[0].text).toBe("the heart of each individual fan");
    expect(d.body.es[0].text).toBe("el corazón de cada fan");
    expect(plan.changed).toBe(true);
  });

  it("leaves stats numbers and matchup proper nouns verbatim", () => {
    const d = doc();
    planArticleBackfill(d, { mutate: true });
    expect(d.body.ko[1].items[0].n).toBe("10.9%"); // datum
    expect(d.body.ko[2].pairs[0].left.group).toBe("Voter"); // proper noun — untouched
    expect(d.body.ko[2].pairs[0].left.title).toBe("Voter");
    expect(d.body.ko[2].note).toBe("팬들의 선택"); // editorial prose — converted
  });

  it("never touches status/template/id", () => {
    const d = doc();
    planArticleBackfill(d, { mutate: true });
    expect(d.status).toBe("published");
    expect(d.template).toBe("weekly");
    expect(d.id).toBe("20260726-3fb980");
  });

  it("records an auditable before/after for every change", () => {
    const plan = planArticleBackfill(doc());
    const koSubhead = plan.changes.find((c) => c.lang === "ko" && c.slot === "subhead");
    expect(koSubhead.before).toContain("Voter들의");
    expect(koSubhead.after).toContain("팬들의");
  });

  it("is a no-op on an already-clean doc", () => {
    const clean = {
      id: "x",
      title: { ko: "제목", en: "Title", es: "Título" },
      subhead: { ko: "부제", en: "Sub", es: "Sub" },
      body: { ko: [{ type: "closer", text: "팬들의 기록" }], en: [], es: [] },
    };
    const plan = planArticleBackfill(clean, { mutate: true });
    expect(plan.changed).toBe(false);
    expect(plan.changes).toEqual([]);
  });
});

/**
 * The full production corpus — every 지칭-bearing string rendered by the three live
 * articles on 2026-08-08 (33 hits: 11 per language). If the backfill would leave any
 * of these half-converted, this fails before anyone touches Firestore.
 */
describe("production corpus — 3 기사 × 3 언어, 잔여 0건", () => {
  const CORPUS: { lang: "ko" | "en" | "es"; slot: string; text: string }[] = [
    // ── 20260726-6c93cc (weekly) ──
    { lang: "ko", slot: "subhead", text: "이번 주 최고 열기는 10.9%—한 Contestant를 향한 Voter들의 선택이 집중되는 순간" },
    { lang: "ko", slot: "hero.subtitle", text: "지금 이 시각, 누군가를 사랑하기로 결심하는 Voter들의 이야기" },
    { lang: "ko", slot: "lead.text", text: "10.9%의 열기가 쏠려 있는 이곳, Voter들의 마음이 어디로 향하고 있는지 한눈에 읽힌다." },
    { lang: "ko", slot: "paragraph.text", text: "테스트3가 모인 Voter들의 선택 속에서 가장 강렬한 신호를 보내고 있다." },
    { lang: "ko", slot: "paragraph.text", text: "고르는 Voter들의 진심이 모인 결과다." },
    { lang: "en", slot: "subhead", text: "This Week's Highest Momentum at 10.9%—A Moment When Voters' Choices Converge on a Single Contestant" },
    { lang: "en", slot: "hero.subtitle", text: "Right Now, This Very Moment—Stories of Voters Making the Decision to Love Someone" },
    { lang: "en", slot: "lead.text", text: "one can immediately see where the Voters' hearts are directing their affection." },
    { lang: "en", slot: "paragraph.text", text: "test3 is sending the most intense signal within the gathered Voters' choices." },
    { lang: "en", slot: "paragraph.text", text: "the result of Voters' sincere hearts coming together to choose who they wish to love more right now." },
    { lang: "es", slot: "subhead", text: "El fervor máximo de esta semana es 10.9%—un instante donde las elecciones de los Voter se concentran en un solo Contestant" },
    { lang: "es", slot: "hero.subtitle", text: "En este instante, la historia de los Voter que deciden amar a alguien" },
    { lang: "es", slot: "lead.text", text: "se puede leer claramente hacia dónde se dirigen los corazones de los Voter." },
    { lang: "es", slot: "paragraph.text", text: "está enviando la señal más intensa entre las elecciones de los Voter reunidos." },
    { lang: "es", slot: "paragraph.text", text: "es el resultado de los sentimientos genuinos de los Voter eligiendo a quién desean amar más." },
    // ── 20260726-3fb980 (weekly) ──
    { lang: "ko", slot: "subhead", text: "눈에 띄는 상승세와 함께 Voter들의 선택이 모여지는 중" },
    { lang: "ko", slot: "lead.text", text: "전국의 Voter들이 새로운 애정을 발견해내고 있는 중이다." },
    { lang: "ko", slot: "paragraph.text", text: "숫자 너머에는 Voter 한 명 한 명의 마음이 담겨 있다." },
    { lang: "ko", slot: "paragraph.text", text: "Voter들 사이에서 새로운 발견과 공감의 물결이 일고 있다는 신호다." },
    { lang: "ko", slot: "closer.text", text: "매주 갱신되는 순위표는 Voter들의 예측 불가능한 사랑의 기록이며" },
    { lang: "en", slot: "subhead", text: "Voter Choices Converge Amid Notable Upward Momentum" },
    { lang: "en", slot: "lead.text", text: "as voters across the nation discover new affection." },
    { lang: "en", slot: "paragraph.text", text: "Behind the numbers lies the heart of each individual Voter." },
    { lang: "en", slot: "paragraph.text", text: "It is a signal that a wave of new discovery and empathy is rising among Voters." },
    { lang: "en", slot: "closer.text", text: "The rankings updated each week are a record of Voters' unpredictable love" },
    { lang: "es", slot: "subhead", text: "Los votantes se reúnen con un aumento notable en las opciones" },
    { lang: "es", slot: "lead.text", text: "y los votantes de todo el país están descubriendo un nuevo afecto." },
    { lang: "es", slot: "paragraph.text", text: "Detrás de los números está el corazón de cada Voter." },
    { lang: "es", slot: "paragraph.text", text: "Es una señal de que entre los Voter está surgiendo una onda de nuevo descubrimiento" },
    { lang: "es", slot: "closer.text", text: "es un registro impredecible del amor de los Voter" },
    // ── 20260730-ca4f8c (column) ──
    { lang: "ko", slot: "paragraph.text", text: "같은 계절을 보내는 수백만의 Voter가 만드는 플레이리스트가 결코 같지 않다는 것이다." },
    { lang: "en", slot: "paragraph.text", text: "playlists created by millions of Voters spending the same season are never the same." },
    { lang: "es", slot: "paragraph.text", text: "las playlists creadas por millones de Voters que pasan la misma estación nunca son iguales." },
  ];

  it("covers all 33 harvested hits (11 per language)", () => {
    expect(CORPUS).toHaveLength(33);
    for (const lang of ["ko", "en", "es"] as const) {
      expect(CORPUS.filter((c) => c.lang === lang)).toHaveLength(11);
    }
  });

  for (const { lang, slot, text } of CORPUS) {
    it(`${lang} · ${slot} — converts with no residue: "${text.slice(0, 40)}…"`, () => {
      const out = replaceDisplayTerm(text, lang, slot);
      expect(out).not.toBe(text); // something actually changed
      expect(findResidue(out, lang)).toEqual([]); // nothing left behind
      expect(replaceDisplayTerm(out, lang, slot)).toBe(out); // idempotent
    });
  }

  it("produces the exact expected Korean for the 조사 case", () => {
    const src = CORPUS.find((c) => c.text.includes("수백만의 Voter가"))!;
    expect(replaceDisplayTerm(src.text, "ko", src.slot)).toBe(
      "같은 계절을 보내는 수백만의 팬이 만드는 플레이리스트가 결코 같지 않다는 것이다.",
    );
  });
});

describe("summarize", () => {
  it("counts docs, changed docs and total replacements", () => {
    const plans = [
      { id: "a", changes: [{}, {}], residue: [], changed: true },
      { id: "b", changes: [], residue: [], changed: false },
      { id: "c", changes: [{}], residue: [{}], changed: true },
    ];
    expect(summarize(plans)).toEqual({
      docs: 3,
      docsChanged: 2,
      replacements: 3,
      docsWithResidue: 1,
    });
  });
});
