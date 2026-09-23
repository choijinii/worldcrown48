import { describe, it, expect } from "vitest";
import { MESSAGES } from "@/lib/i18n/messages";

describe("messages content (B-2 편승 · 오탈 정정)", () => {
  it("champion.returning.banner uses the correct Korean particle (는, not 은)", () => {
    // "Tournament" reads ending in a vowel → 는. (§3 #7 오탈 편승 수정)
    expect(MESSAGES["champion.returning.banner"].ko).toContain("이 Tournament는");
    expect(MESSAGES["champion.returning.banner"].ko).not.toContain("이 Tournament은");
  });

  it("has the #12 arena vote error copy in all three languages", () => {
    for (const key of [
      "arena.vote.dailyLimit",
      "arena.vote.rateLimited",
      "arena.vote.failed",
    ] as const) {
      expect(MESSAGES[key].ko).toBeTruthy();
      expect(MESSAGES[key].en).toBeTruthy();
      expect(MESSAGES[key].es).toBeTruthy();
    }
  });

  it("has the Lab create-flow copy in all three languages (스코프 #8)", () => {
    const labKeys = (Object.keys(MESSAGES) as (keyof typeof MESSAGES)[]).filter(
      (k) => k.startsWith("lab."),
    );
    // The flow is substantial — make sure the block actually landed.
    expect(labKeys.length).toBeGreaterThanOrEqual(30);
    for (const key of labKeys) {
      const entry = MESSAGES[key] as { ko: string; en: string; es?: string };
      expect(entry.ko, `${key}.ko`).toBeTruthy();
      expect(entry.en, `${key}.en`).toBeTruthy();
      expect(entry.es, `${key}.es`).toBeTruthy();
    }
  });
});

/**
 * RUN-1 §8 문구표 — 2026-09-07 대표 승인 최종본을 **글자 단위로** 고정한다 (AC 12).
 *
 * §5 DO 7: 문구는 승인 완료본이고 한 글자도 임의 변경 금지다. 아래 문자열이 흔들리면
 * 누군가 승인 없이 고쳤다는 뜻이다 — 눈으로 대조하는 규율보다 이 테스트가 강하다.
 *
 * 표시 용어 규칙(LANGUAGE.md §1 v2.2): 화면의 '판'은 "참여"로 순화하고, "표"는 낱말 자체가
 * 금지어다(§7). ko 값은 그 규칙을 반영한 최종본이다.
 */
describe("RUN-1 §8 문구표 (2026-09-07 대표 승인 최종본)", () => {
  const APPROVED = {
    "arena.vote.dailyLimit": {
      ko: "이 Tournament는 오늘 5번 참여를 모두 하셨어요 (5/5)",
      en: "You've played all 5 runs of this Tournament today (5/5)",
      es: "Ya has jugado las 5 partidas de este Tournament hoy (5/5)",
    },
    "arena.vote.dailyLimitSub": {
      ko: "한국 시간 자정에 참여 횟수가 다시 채워져요. 다른 Tournament는 지금 바로 참여하실 수 있어요.",
      en: "Your 5 runs reset at Seoul midnight. Other Tournaments are open right now.",
      es: "Tus 5 partidas se reinician a medianoche de Seúl. Otros Tournaments están abiertos ahora.",
    },
    "arena.run.playAgain": {
      ko: "다시 참여 ({n}/{limit})",
      en: "Play again ({n}/{limit})",
      es: "Jugar otra vez ({n}/{limit})",
    },
    "arena.run.pastCards": {
      ko: "이전 참여의 Crown Card",
      en: "Your earlier Crown Cards",
      es: "Tus Crown Cards anteriores",
    },
    "arena.vote.rateLimited": {
      ko: "조금 빠르게 고르고 계시네요. 몇 초만 쉬었다 이어가 주세요.",
      en: "You're choosing quickly. Take a few seconds, then keep going.",
      es: "Estás eligiendo muy rápido. Espera unos segundos y continúa.",
    },
    "arena.run.deadlinePassed": {
      ko: "이 Tournament는 마감됐어요. 다른 Tournament에 참여해 보세요.",
      en: "This Tournament has closed. Try a new run in another Tournament.",
      es: "Este Tournament ha cerrado. Empieza una nueva partida en otro Tournament.",
    },
    "login.guest_limit.title": {
      ko: "오늘의 서비스(3번 참여)를 모두 소진하셨어요.",
      en: "You've used all 3 of today's free entries.",
      es: "Has usado tus 3 participaciones gratis de hoy.",
    },
    "login.guest_limit.sub": {
      ko: "로그인하면 Tournament마다 하루 5번까지 참여 — 내 선택이 랭킹에 반영돼요.",
      en: "Sign in for up to 5 entries a day in every Tournament — and your picks count in the Ranking.",
      es: "Inicia sesión: hasta 5 participaciones al día en cada Tournament — y tus elecciones cuentan en el Ranking.",
    },
    // ARENA-1 PR 2b §5 — 2026-09-23 대표 승인본 (확정 연출 3 · 라운드 전환 7 · 팝업 4).
    "arena.confirm.waiting": { ko: "확인 중", en: "Confirming", es: "Confirmando" },
    "arena.confirm.nextMatch": { ko: "다음 매치로", en: "Next Match", es: "Siguiente Match" },
    "arena.confirm.toCrownCard": {
      ko: "Crown Card로",
      en: "Go to Crown Card",
      es: "A la Crown Card",
    },
    "arena.round.cornerTopLeft": {
      ko: "당신의 선택은 계속됩니다",
      en: "Your picks continue",
      es: "Tus elecciones continúan",
    },
    "arena.round.cornerTopRight": {
      ko: "남은 무대 {n}",
      en: "{n} stages left",
      es: "{n} escenarios restantes",
    },
    "arena.round.cornerBottomLeft": {
      ko: "다음 라운드 준비",
      en: "Next round ahead",
      es: "Siguiente ronda en camino",
    },
    "arena.round.cornerBottomRight": {
      ko: "탭하면 바로",
      en: "Tap to skip",
      es: "Toca para saltar",
    },
    "arena.round.nextLine": {
      ko: "다음 무대가 곧 열립니다",
      en: "The next stage opens now",
      es: "El siguiente escenario se abre ya",
    },
    "arena.round.progress": {
      ko: "2.0s · 탭하면 바로 넘어갑니다",
      en: "2.0s · Tap to skip ahead",
      es: "2.0s · Toca para saltar",
    },
    "arena.round.nextRoundButton": {
      ko: "다음 라운드로",
      en: "Next round",
      es: "Siguiente ronda",
    },
    "arena.intro.welcome": {
      ko: "48개의 무대, 당신의 선택은",
      en: "48 stages. Your pick.",
      es: "48 escenarios. Tu elección.",
    },
    "arena.intro.data": {
      ko: "선택은 이 기기에 저장되고, 로그인하면 계정으로 이어집니다.",
      en: "Your picks are saved on this device and carry over to your account when you sign in.",
      es: "Tus elecciones se guardan en este dispositivo y pasan a tu cuenta al iniciar sesión.",
    },
    "arena.intro.crownCard": {
      ko: "Crown Card는 Tournament가 끝난 뒤 공개됩니다",
      en: "Your Crown Card is revealed when the Tournament ends",
      es: "Tu Crown Card se revela cuando termina el Tournament",
    },
    "arena.intro.start": { ko: "시작하기", en: "Start", es: "Empezar" },
    // ARENA-1 PR 2a §5 표 — 2026-09-20 대표 승인본. 모양은 그대로, 글자만 키로 옮긴 건이라
    // 승인본을 글자 단위로 고정한다(라운드 전환 3건 · 결승 4건).
    "arena.round.spectatorNote": {
      ko: "✦ 잠시 숨을 고르는 시간",
      en: "✦ A moment to breathe",
      es: "✦ Un momento para respirar",
    },
    "arena.round.completed": {
      ko: "방금 마친 라운드 {round}",
      en: "You completed {round}",
      es: "Has completado {round}",
    },
    "arena.round.next": {
      ko: "다음 라운드",
      en: "Next round",
      es: "Siguiente ronda",
    },
    "arena.final.eyebrow": {
      ko: "결승 · THE FINAL",
      en: "THE FINAL",
      es: "THE FINAL",
    },
    "arena.final.title": {
      ko: "당신의 최애를 골라 주세요",
      en: "Pick your Choe-ae",
      es: "Elige a tu Choe-ae",
    },
    "arena.final.sub": {
      ko: "세 명 중 한 명을 직접 골라 주세요",
      en: "Pick one of the three",
      es: "Elige a uno de los tres",
    },
    "arena.final.foot": {
      ko: "한 번의 선택 · 하나의 Crown · 되돌리기 없음",
      en: "One pick · One Crown · No do-overs",
      es: "Una elección · Un Crown · Sin vuelta atrás",
    },
    "arena.guest.remaining": {
      ko: "오늘 남은 참여 가능 횟수는 : {n}판 · 저장하려면 로그인",
      en: "Entries left today: {n} · Sign in to save",
      es: "Participaciones restantes hoy: {n} · Inicia sesión para guardar",
    },
    // AC 15 (2026-09-04 승인) — 랭킹 발표가 하루 두 번이 되면서 생긴 "다음 발표" 한 줄.
    // en·es는 시간대를 명시한다(§8 발표 시각 표기 규칙: 시각은 KST 고정).
    "ranking.nextUpdate.today": {
      ko: "다음 발표: 오늘 21:00",
      en: "Next update: today 21:00 KST",
      es: "Próxima actualización: hoy 21:00 KST",
    },
    "ranking.nextUpdate.tomorrow": {
      ko: "다음 발표: 내일 09:00",
      en: "Next update: tomorrow 09:00 KST",
      es: "Próxima actualización: mañana 09:00 KST",
    },
  } as const;

  for (const [key, langs] of Object.entries(APPROVED)) {
    for (const [lang, text] of Object.entries(langs)) {
      it(`${key}.${lang} 이 승인본과 글자 단위로 같다`, () => {
        const entry = MESSAGES[key as keyof typeof MESSAGES] as {
          ko: string;
          en: string;
          es?: string;
        };
        expect(entry[lang as "ko" | "en" | "es"]).toBe(text);
      });
    }
  }
});

describe("히어로 문구 정정 (2026-09-07 승인)", () => {
  it("'예측도, 배당도 없이' 구절이 3언어 모두에서 사라졌다", () => {
    // 예측·배당은 도박·투기를 연상시킨다(대표) — 서비스 정체성 금지 항목이다.
    const sub = MESSAGES["pitch.hero.sub"];
    expect(sub.ko).not.toContain("예측");
    expect(sub.ko).not.toContain("배당");
    expect(sub.en).not.toContain("No predictions");
    expect(sub.en).not.toContain("odds");
    expect(sub.es).not.toContain("predicciones");
    expect(sub.es).not.toContain("apuestas");
  });

  it("뒷부분이 승인본으로 교체됐다", () => {
    expect(MESSAGES["pitch.hero.sub"].ko).toContain(
      "오직 팬의 선택. 당신의 선택이 왕관의 주인을 만듭니다.",
    );
    expect(MESSAGES["pitch.hero.sub"].en).toContain(
      "Pure fan choice. Your pick crowns the Champion.",
    );
    expect(MESSAGES["pitch.hero.sub"].es).toContain(
      "Solo la elección de los fans. Tu elección corona al Champion.",
    );
  });

  it("앞부분은 3언어 그대로 남는다", () => {
    expect(MESSAGES["pitch.hero.sub"].ko).toContain("48 Contestants. Five Rounds.");
    expect(MESSAGES["pitch.hero.sub"].en).toContain("48 Contestants. Five Rounds.");
    expect(MESSAGES["pitch.hero.sub"].es).toContain("48 Contestants. Cinco Rounds.");
  });

  it("금지어 '표'가 팬 노출 문구에 없다 (LANGUAGE.md §7)", () => {
    // "당신의 한 표가 Champion을 만듭니다" 가 이 정정의 직접 대상이었다.
    expect(MESSAGES["pitch.hero.sub"].ko).not.toContain("표");
  });
});
