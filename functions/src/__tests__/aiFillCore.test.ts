import { describe, it, expect, vi } from "vitest";
import { aiFillCore, AiFillError, buildPrompt } from "../core/aiFillCore";
import { ContestantParseError } from "../core/parseContestants";

function fakeArray(n: number): string {
  return JSON.stringify(
    Array.from({ length: n }, (_, i) => ({
      name: `P${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: `p${i + 1}`,
    })),
  );
}

const okDeps = { createMessage: vi.fn(async () => fakeArray(48)) };

const validInput = { uid: "admin1", title: "Best Strikers", category: "FOOTBALL" };

describe("aiFillCore", () => {
  it("returns 48 suggestions for a valid request", async () => {
    const result = await aiFillCore(validInput, okDeps);
    expect(result).toHaveLength(48);
  });

  it("passes a prompt containing the title and category to the model", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore(validInput, { createMessage });
    const prompt = createMessage.mock.calls[0][0];
    expect(prompt).toContain("Best Strikers");
    expect(prompt).toContain("FOOTBALL");
  });

  it("throws unauthenticated when uid is missing", async () => {
    await expect(
      aiFillCore({ ...validInput, uid: undefined }, okDeps),
    ).rejects.toMatchObject({ reason: "unauthenticated" });
  });

  it("throws invalid-argument for empty title", async () => {
    await expect(
      aiFillCore({ ...validInput, title: "   " }, okDeps),
    ).rejects.toBeInstanceOf(AiFillError);
  });

  it("throws invalid-argument for a title over 50 chars", async () => {
    await expect(
      aiFillCore({ ...validInput, title: "a".repeat(51) }, okDeps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  // TX-0: categories are DATA, not an enum. aiFillCore only builds a prompt, so
  // it enforces category SHAPE (non-empty string); the authoritative id check is
  // at Tournament creation (buildTournamentDoc), so a bad category can never
  // become a real Tournament. An empty/blank category is still rejected BEFORE
  // the model is called (cost guard, trap #10).
  it("throws invalid-argument for a blank category", async () => {
    await expect(
      aiFillCore({ ...validInput, category: "   " }, okDeps),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
  });

  it("does NOT call the model when validation fails (cost guard, trap #10)", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore({ ...validInput, category: "" }, { createMessage }).catch(
      () => {},
    );
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("throws ai-failed when the model call rejects", async () => {
    const createMessage = vi.fn(async () => {
      throw new Error("network");
    });
    await expect(
      aiFillCore(validInput, { createMessage }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
  });

  // AI-1: 47명은 이제 허용 범위(floor 46)다 — floor 아래인 45명으로 내려서 검사한다.
  it("propagates a ContestantParseError when the model returns too few", async () => {
    const createMessage = vi.fn(async () => fakeArray(45));
    await expect(
      aiFillCore(validInput, { createMessage }),
    ).rejects.toBeInstanceOf(ContestantParseError);
  });

  it("injects description + keywords as prompt hints when provided", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore(
      { ...validInput, description: "글로벌 톱 스트라이커", keywords: ["goal", "speed"] },
      { createMessage },
    );
    const prompt = createMessage.mock.calls[0][0];
    expect(prompt).toContain("글로벌 톱 스트라이커");
    expect(prompt).toContain("goal");
    expect(prompt).toContain("speed");
  });

  describe("blank-only mode (existing[])", () => {
    it("requests only the missing count and excludes existing names", async () => {
      const createMessage = vi.fn(async () => fakeArray(1));
      const existing = Array.from({ length: 47 }, (_, i) => `P${i + 1}`);
      const result = await aiFillCore(
        { ...validInput, existing },
        { createMessage },
      );
      expect(result).toHaveLength(1); // only the 1 blank
      const prompt = createMessage.mock.calls[0][0];
      expect(prompt).toContain("P1"); // exclusion list injected
      expect(prompt).toContain("47"); // already-have count referenced
    });

    it("rejects when there are no blanks to fill (existing >= 48)", async () => {
      const createMessage = vi.fn(async () => fakeArray(48));
      const existing = Array.from({ length: 48 }, (_, i) => `P${i + 1}`);
      await expect(
        aiFillCore({ ...validInput, existing }, { createMessage }),
      ).rejects.toMatchObject({ reason: "invalid-argument" });
      expect(createMessage).not.toHaveBeenCalled(); // cost guard
    });
  });

  it("logs the original error via logError before throwing ai-failed", async () => {
    const original = new Error("anthropic 500");
    const createMessage = vi.fn(async () => {
      throw original;
    });
    const logError = vi.fn();
    await expect(
      aiFillCore(validInput, { createMessage, logError }),
    ).rejects.toMatchObject({ reason: "ai-failed" });
    expect(logError).toHaveBeenCalledWith(expect.any(String), original);
  });
});

/**
 * AI-2 (2026-08-18) — 힌트 칸 계약 · 불확실 인물 출구 · 명단 적격성.
 *
 * 문구는 골든(실호출)이 진짜 검증자다(R2). 여기서 재는 건 "그 문구가 프롬프트에
 * 실제로 실려 나가는가" 하나다 — AI-1에서 프롬프트를 고쳐 놓고 조건 분기 때문에
 * 안 실려 나간 적이 있다면 이 테스트가 잡는다.
 */
describe("buildPrompt — AI-2 계약 문구", () => {
  const base = { title: "K-POP 4세대 걸그룹 최강자", category: "KPOP", count: 48 };

  it("imageSearchKeyword가 '그대로 넣을 검색어'임을 정의한다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("imageSearchKeyword 규칙:");
    expect(prompt).toContain("유튜브 검색창에 그대로 붙여 넣을 검색어");
    expect(prompt).toContain("메모장이 아니다");
  });

  it("메모·의문·물음표를 금지한다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("물음표를 절대 넣지 말 것");
  });

  // AI-2.5: 곡명 금지. 스모크에서 곡명 한 낱말이 검색 과협소·중복 미병합·플래그
  // 오탐을 한꺼번에 만들었다. 검증기로는 못 거르므로(임의의 낱말) 계약이 유일한 방어다.
  it("곡 제목을 금지하고 형식을 3~4단어로 좁힌다", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("곡 제목·노래 이름은 넣지 말 것");
    expect(prompt).toContain("그룹 영문명 + 활동명 영문 + stage 또는 performance");
    expect(prompt).toContain("3~4단어로 끝낸다");
  });

  it("금지 이유까지 함께 실어 보낸다 (규칙만 주면 잘 안 지킨다)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("검색이 지나치게 좁아져");
    expect(prompt).toContain("같은 인물이 곡만 바꿔 두 번 오른다");
  });

  it("불확실 인물의 출구를 준다 — 확신 없으면 빼라", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("확신할 수 없으면 그 인물을 목록에서 빼라");
    expect(prompt).toContain("여유 있게 요청했으니");
  });

  it("명단 적격성 규칙을 싣는다 (탈퇴·활동중단·논란 제외)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("탈퇴·퇴출된 전 멤버");
    expect(prompt).toContain("해체했거나 활동을 중단한 팀");
    expect(prompt).toContain("학교폭력·범죄");
  });

  // AI-2.2: 이 규칙은 2026-08-19 골든에서 **한 번 뚫렸다**. 강화 문구가 통째로
  // 빠지면 같은 사고가 조용히 재발하므로 세 조각을 각각 못 박는다.
  it("강화된 적격성 문구 3요소가 모두 나간다 (금지 목록 · 현재 멤버 · 자문 절차)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("지금 그 팀의 현재 공식 멤버");
    expect(prompt).toContain("지금 활동 중인가");
    expect(prompt).toContain("다른 사람으로 채운다");
  });

  it("blank-only 모드에서도 계약 문구가 함께 나간다", () => {
    // 빈칸만 채우는 경로가 계약을 잃으면 오염이 그 경로로만 되살아난다.
    const prompt = buildPrompt({ ...base, count: 6, existing: ["설윤", "지수"] });
    expect(prompt).toContain("imageSearchKeyword 규칙:");
    expect(prompt).toContain("탈퇴·퇴출된 전 멤버");
  });

  it("기존 규칙은 그대로 남는다 (추가만 — RULE 1)", () => {
    const prompt = buildPrompt(base);
    expect(prompt).toContain("실존 인물만");
    expect(prompt).toContain("같은 인물을 두 번 넣지 말 것");
    expect(prompt).toContain("미성년자 금지");
    expect(prompt).toContain("국적을 가리지 말 것");
  });
});

describe("aiFillCore — 폐기 로그 (AI-2)", () => {
  it("검증기가 버린 항목을 사유와 함께 로그로 남긴다", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      name: `P${i + 1}`,
      nationality: "KR",
      position: "FW",
      imageSearchKeyword: i === 0 ? "Group1 아님 P2 확인" : `group${i} stage`,
    }));
    const logInfo = vi.fn();
    const result = await aiFillCore(validInput, {
      createMessage: async () => JSON.stringify(rows),
      logInfo,
    });
    expect(result).toHaveLength(48);
    expect(result.some((c) => c.name === "P1")).toBe(false);
    expect(logInfo).toHaveBeenCalledTimes(1);
    const line = logInfo.mock.calls[0][0] as string;
    expect(line).toContain("polluted-hint");
    expect(line).toContain("P1");
  });

  it("버릴 게 없으면 로그도 남기지 않는다", async () => {
    const logInfo = vi.fn();
    await aiFillCore(validInput, { createMessage: async () => fakeArray(48), logInfo });
    expect(logInfo).not.toHaveBeenCalled();
  });
});

// ── ENTRY-UNIT-1 (원장 D-73) — 엔트리 단위 = 팀 ────────────────────────────
// 위의 개인 경로 시험은 한 줄도 고치지 않았다. 여기는 팀 경로만 본다.
describe("buildPrompt — 팀 경로 (ENTRY-UNIT-1)", () => {
  const base = { title: "최고의 무대를 연출한 팀은 누구?", category: "KPOP", count: 48 };

  it("단위를 안 주면 개인 경로와 글자 하나까지 같다 (옛 화면 호환)", () => {
    expect(buildPrompt(base)).toBe(buildPrompt({ ...base, entryUnit: "individual" }));
    const withExisting = { ...base, count: 2, existing: ["가", "나"], keywords: ["k"] };
    expect(buildPrompt(withExisting)).toBe(
      buildPrompt({ ...withExisting, entryUnit: "individual" }),
    );
  });

  it("팀이면 다른 프롬프트를 쓰고, 멤버 개인을 넣지 말라고 말한다", () => {
    const p = buildPrompt({ ...base, entryUnit: "group" });
    expect(p).not.toBe(buildPrompt(base));
    expect(p).toContain("멤버 개인은 넣지 않는다");
    expect(p).toContain("솔로 활동가도 넣지 않는다");
    expect(p).toContain("같은 그룹을 두 번 넣지 말 것");
    expect(p).toContain(base.title);
    expect(p).toContain("KPOP");
  });

  it("엔트리를 '명'으로 세지 않는다 — '개'로 센다 (원장 D-31)", () => {
    const p = buildPrompt({ ...base, entryUnit: "group" });
    expect(p).not.toMatch(/\d명/);
    expect(p).toContain("51~53개");
    expect(p).toContain("48개만 채택");
  });

  it("소속 칸 = 소속사, 국적 = ISO 두 글자 규칙은 그대로", () => {
    const p = buildPrompt({ ...base, entryUnit: "group" });
    expect(p).toContain("affiliation = 그 그룹의 소속사");
    // 원장 D-61 — 이름 정본은 한글(개인 경로와 같음). 2026-10-29 사전 점검에서 영어로 와서 못 박았다.
    expect(p).toContain("name = 그룹의 **한글 이름**");
    expect(p).toContain("ISO 3166-1 alpha-2");
  });

  it("적격성은 팀 단위 — 해체·활동 중단 · 중대한 논란. 탈퇴 멤버 문장은 없다", () => {
    const p = buildPrompt({ ...base, entryUnit: "group" });
    expect(p).toContain("해체했거나 활동을 중단한 그룹");
    expect(p).toContain("중대한 사회적 물의");
    expect(p).not.toContain("현재 공식 멤버");
  });

  it("검색어 계약 — '<그룹 영문명> stage|performance' 2~3단어 · 활동명·곡명·메모 금지", () => {
    const p = buildPrompt({ ...base, entryUnit: "group" });
    expect(p).toContain('"<그룹 영문명> stage"');
    expect(p).toContain('"<그룹 영문명> performance"');
    expect(p).toContain("2~3단어");
    expect(p).not.toContain("활동명");
    expect(p).toContain("멤버 이름은 넣지 말 것");
    expect(p).toContain("곡 제목·노래 이름은 넣지 말 것");
    expect(p).toContain("메모·설명·의문");
  });

  it("빈칸만 AI(blanks)도 팀 단위로 말한다", () => {
    const p = buildPrompt({
      ...base,
      count: 2,
      existing: ["BLACKPINK", "TWICE"],
      entryUnit: "group",
    });
    expect(p).toContain("이미 엔트리 2개가 채워져 있어");
    expect(p).toContain("새 그룹만");
    expect(p).toContain("BLACKPINK, TWICE");
    expect(p).not.toMatch(/\d명/);
  });
});

/** 실제로 올라올 법한 K-POP 그룹 51개 — 이름이 겹치는 낱말(NCT·Girls·Kids)을 일부러 섞었다. */
const GROUP_ROWS: { name: string; affiliation: string; hint: string }[] = [
  ["방탄소년단", "BIGHIT MUSIC", "BTS stage"],
  ["블랙핑크", "YG Entertainment", "BLACKPINK stage"],
  ["트와이스", "JYP Entertainment", "TWICE performance"],
  ["세븐틴", "PLEDIS Entertainment", "SEVENTEEN stage"],
  ["스트레이 키즈", "JYP Entertainment", "Stray Kids stage"],
  ["뉴진스", "ADOR", "NewJeans stage"],
  ["에스파", "SM Entertainment", "aespa stage"],
  ["아이브", "STARSHIP Entertainment", "IVE stage"],
  ["르세라핌", "SOURCE MUSIC", "LE SSERAFIM stage"],
  ["(여자)아이들", "CUBE Entertainment", "i-dle stage"],
  ["엔시티 127", "SM Entertainment", "NCT 127 stage"],
  ["엔시티 드림", "SM Entertainment", "NCT DREAM stage"],
  ["엔시티 위시", "SM Entertainment", "NCT WISH stage"],
  ["레드벨벳", "SM Entertainment", "Red Velvet stage"],
  ["소녀시대", "SM Entertainment", "Girls' Generation stage"],
  ["있지", "JYP Entertainment", "ITZY stage"],
  ["엔믹스", "JYP Entertainment", "NMIXX stage"],
  ["에이티즈", "KQ Entertainment", "ATEEZ stage"],
  ["엔하이픈", "BELIFT LAB", "ENHYPEN stage"],
  ["투모로우바이투게더", "BIGHIT MUSIC", "TXT stage"],
  ["더보이즈", "ONE HUNDRED", "THE BOYZ stage"],
  ["몬스타엑스", "STARSHIP Entertainment", "MONSTA X stage"],
  ["마마무", "RBW", "MAMAMOO stage"],
  ["오마이걸", "WM Entertainment", "OH MY GIRL stage"],
  ["스테이씨", "HIGH UP Entertainment", "STAYC stage"],
  ["케플러", "WAKEONE", "Kep1er stage"],
  ["아일릿", "BELIFT LAB", "ILLIT stage"],
  ["베이비몬스터", "YG Entertainment", "BABYMONSTER stage"],
  ["보이넥스트도어", "KOZ Entertainment", "BOYNEXTDOOR stage"],
  ["라이즈", "SM Entertainment", "RIIZE stage"],
  ["제로베이스원", "WAKEONE", "ZEROBASEONE stage"],
  ["트레저", "YG Entertainment", "TREASURE stage"],
  ["빅뱅", "YG Entertainment", "BIGBANG stage"],
  ["샤이니", "SM Entertainment", "SHINee stage"],
  ["엑소", "SM Entertainment", "EXO stage"],
  ["슈퍼주니어", "SM Entertainment", "Super Junior stage"],
  ["동방신기", "SM Entertainment", "TVXQ stage"],
  ["갓세븐", "", "GOT7 stage"],
  ["데이식스", "JYP Entertainment", "DAY6 performance"],
  ["비투비", "BTB Entertainment", "BTOB stage"],
  ["위너", "YG Entertainment", "WINNER stage"],
  ["아이콘", "143 Entertainment", "iKON stage"],
  ["프로미스나인", "ASND", "fromis_9 stage"],
  ["우주소녀", "STARSHIP Entertainment", "WJSN stage"],
  ["드림캐쳐", "Dreamcatcher Company", "Dreamcatcher stage"],
  ["키스오브라이프", "S2 Entertainment", "KISS OF LIFE stage"],
  ["트리플에스", "MODHAUS", "tripleS stage"],
  ["하츠투하츠", "SM Entertainment", "Hearts2Hearts stage"],
  ["투어스", "PLEDIS Entertainment", "TWS stage"],
  ["에잇턴", "MNH Entertainment", "8TURN stage"],
  ["크래비티", "STARSHIP Entertainment", "CRAVITY stage"],
].map(([name, affiliation, hint]) => ({ name, affiliation, hint }));

describe("aiFillCore — 팀 경로 끝까지 (ENTRY-UNIT-1)", () => {
  const groupInput = { ...validInput, title: "최고의 무대를 연출한 팀", category: "KPOP" };
  const groupReply = JSON.stringify(
    GROUP_ROWS.map((g) => ({
      name: g.name,
      nationality: "KR",
      affiliation: g.affiliation,
      imageSearchKeyword: g.hint,
    })),
  );

  it("entryUnit=group 이 모델에게 팀 경로 프롬프트로 간다", async () => {
    const createMessage = vi.fn(async () => groupReply);
    await aiFillCore({ ...groupInput, entryUnit: "group" }, { createMessage });
    expect(createMessage.mock.calls[0][0]).toContain("멤버 개인은 넣지 않는다");
  });

  it("entryUnit 이 없으면 지금과 같은 개인 경로 프롬프트", async () => {
    const createMessage = vi.fn(async () => fakeArray(48));
    await aiFillCore(validInput, { createMessage });
    expect(createMessage.mock.calls[0][0]).toBe(
      buildPrompt({ title: "Best Strikers", category: "FOOTBALL", count: 48 }),
    );
  });

  it("모르는 단위 값은 모델을 부르기 전에 돌려보낸다 (비용 가드)", async () => {
    const createMessage = vi.fn(async () => groupReply);
    await expect(
      aiFillCore({ ...groupInput, entryUnit: "team" }, { createMessage }),
    ).rejects.toMatchObject({ reason: "invalid-argument" });
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("그룹 이름 명단이 제외 목록·중복 판정에 잘못 걸리지 않는다 — 48개 그대로, 버림·검수 깃발 0", async () => {
    const logInfo = vi.fn();
    const result = await aiFillCore(
      { ...groupInput, entryUnit: "group" },
      { createMessage: async () => groupReply, logInfo },
    );
    expect(result).toHaveLength(48);
    expect(result.map((c) => c.name)).toEqual(GROUP_ROWS.slice(0, 48).map((g) => g.name));
    // 버린 항목도, 중복 의심·이름 불일치 깃발도 없어야 로그가 비어 있다.
    expect(logInfo).not.toHaveBeenCalled();
    expect(result.find((c) => c.name === "(여자)아이들")?.affiliation).toBe("CUBE Entertainment");
  });

  it("같은 그룹이 두 번 오르면 하나로 접는다 (중복 판정은 팀에도 그대로)", async () => {
    const rows = [
      ...GROUP_ROWS.slice(0, 48),
      { name: "BLACKPINK", affiliation: "YG Entertainment", hint: "BLACKPINK performance" },
    ];
    // 겹치는 항목을 앞쪽에 끼워 넣어 실제로 판정을 타게 한다.
    rows.splice(5, 0, rows.pop()!);
    const logInfo = vi.fn();
    const result = await aiFillCore(
      { ...groupInput, entryUnit: "group" },
      {
        createMessage: async () =>
          JSON.stringify(
            rows.map((g) => ({
              name: g.name,
              nationality: "KR",
              affiliation: g.affiliation,
              imageSearchKeyword: g.hint,
            })),
          ),
        logInfo,
      },
    );
    expect(result).toHaveLength(48);
    expect(result.filter((c) => /blackpink/i.test(c.imageSearchKeyword))).toHaveLength(1);
    expect(logInfo.mock.calls.map((c) => c[0]).join("\n")).toContain("duplicate-merged");
  });
});
