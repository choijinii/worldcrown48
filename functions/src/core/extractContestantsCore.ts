/**
 * extractContestantsCore — 붙여넣은 유튜브 링크의 **제목·채널명에서** 인물을 읽어낸다
 * (LAB-UX-1 마무리 ③, 대표 확정 2026-08-26).
 *
 * 운영자가 링크 48개를 붙이면 지금까지는 영상만 슬롯에 꽂혔다. 이름·소속은 전부
 * 손으로 쳐야 했다. 그런데 그 정보는 대개 제목에 이미 적혀 있다
 * (`[KARINA FOCUS] aespa 카리나 직캠`). 검수 단계에서 제목·채널을 이미 받아오므로
 * (LinkVerdict.title/channelTitle) **추가 API 없이** 그 문자열만 모델에 넘긴다.
 *
 * ── 이 프롬프트는 위험군이다 ──────────────────────────────────────────────
 * "영상 제목을 보고 사람 이름을 적어라"는 지시는 AI-1의 허구 인물 생성 사고와
 * 같은 종류다([[feedback_prompt_rule_overgeneralizes]]). 그래서 계약을 뒤집는다:
 * **모르면 비워라.** 빈 이름은 실패가 아니라 정상 출력이고, 화면은 그 칸을
 * "수동 필요"로 표시해 사람에게 넘긴다. 지어낸 이름 하나가 48명 명단에 박히는
 * 것보다 빈칸 하나가 낫다.
 *
 * 표기도 같은 원칙의 연장이다(2026-08-27 골든): 제목에 적힌 그대로 쓰고 **로마자로
 * 옮기지 않는다.** 옮기는 것도 제목에 없는 문자열을 만드는 일이고, AI 채우기는 한글로
 * 채우므로 섞이면 같은 사람이 `카리나`와 `Karina`로 두 번 앉는다.
 *
 * 국가도 같은 원칙이다 — 제목에 국적이 적히는 일은 드물다. 확실할 때만 채운다
 * (대표 확정). 소속은 제목·채널에 그룹명이 그대로 나오는 경우가 많아 이름보다
 * 신뢰도가 높지만, 역시 없으면 비운다.
 *
 * 소속(affiliation)은 이름과 반대로 **로마자 표기를 우선**한다(2026-08-29 대표 확정,
 * name-i18n-gap.md ②) — 화면 전체 소속 표기를 영문 공식명(aespa·IVE)으로 통일하는
 * 결정과 맞추기 위해서다. 이름은 한글 고정(중복 판정용 정본), 소속은 영문 고정
 * (표시용) — 서로 다른 이유로 반대 방향을 향하니 헷갈리지 말 것.
 *
 * 주입식 deps(`createMessage`)는 aiFillCore·aiSuggestKeywordsCore와 같은 모양이라
 * Firebase·네트워크 없이 단위 테스트가 돈다.
 */

/** 추출 대상 1건 — 검수기가 이미 받아 둔 값만 넘긴다(추가 API 0콜). */
export interface ExtractItem {
  videoId: string;
  title: string;
  channelTitle: string;
}

/** 추출 결과 1건. 이름이 비면 `confident: false`이고 화면은 "수동 필요"로 그린다. */
export interface ExtractedContestant {
  videoId: string;
  /** 확신할 수 없으면 **빈 문자열**. 지어내지 않는다. */
  name: string;
  /** 그룹·팀·채널. 없으면 빈 문자열. */
  affiliation: string;
  /** ISO 3166-1 alpha-2. 확실할 때만. 없으면 빈 문자열. */
  nationality: string;
  /** 이름을 확신하는가 — 화면 배지(제안 / 수동 필요)를 가른다. */
  confident: boolean;
}

export type ExtractErrorReason = "unauthenticated" | "invalid-argument" | "ai-failed";

export class ExtractError extends Error {
  constructor(
    public reason: ExtractErrorReason,
    message: string,
  ) {
    super(message);
    this.name = "ExtractError";
  }
}

/** 한 콜에 담을 최대 항목 수 — 48칸을 한 번에 붙여도 1콜로 끝난다. */
export const MAX_EXTRACT_ITEMS = 48;

export interface ExtractDeps {
  createMessage: (prompt: string) => Promise<string>;
  logInfo?: (message: string) => void;
  logError?: (message: string, err: unknown) => void;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 국가 값 정규화 — parseContestants.normalizeCountry와 같은 규칙(두 곳 복제 허용 지점). */
function normalizeCountry(value: string): string {
  const trimmed = toStr(value);
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : "";
}

export function buildExtractPrompt(items: readonly ExtractItem[]): string {
  const rows = items
    .map(
      (it, i) =>
        `${i + 1}. id="${it.videoId}" | 제목="${it.title}" | 채널="${it.channelTitle}"`,
    )
    .join("\n");

  return [
    "아래는 유튜브 영상의 제목과 채널명이다. 각 줄이 **어떤 인물의 영상인지** 읽어라.",
    "",
    "규칙:",
    // 이 세 줄이 이 프롬프트의 전부다. 나머지는 형식이다.
    "- 제목·채널에 적힌 것만 근거로 삼는다. 바깥 지식으로 보충하지 마라",
    "- 인물을 **확신할 수 없으면 name을 빈 문자열로 두고 confident를 false로** 한다. 빈칸은 정상이고, 사람이 나중에 채운다",
    "- 절대로 그럴듯한 이름을 지어내지 마라. 틀린 이름 하나가 빈칸 하나보다 훨씬 나쁘다",
    "",
    "- name: 인물 한 명의 활동명. 그룹 전체 영상이라 한 명을 특정할 수 없으면 비운다",
    // 2026-08-27 골든: `카리나`가 적힌 제목에서 `Karina`가 돌아왔다. 로마자로 옮기는
    // 것도 **제목에 없는 문자열을 만드는 일**이라 "지어내지 마라"의 연장이다.
    // 게다가 AI 채우기(aiFillContestants)는 한글로 채우므로, 한 토너먼트에
    // `카리나`와 `Karina`가 같이 앉고 중복 판정도 못 잡는다
    // (normalizeNameKey는 한글↔로마자를 같은 키로 묶지 않는다 — AI-2가 "변환표는
    //  범위 밖"으로 명시한 지점이다).
    "- name은 **제목·채널에 적힌 표기를 그대로** 쓴다. 로마자로 옮기거나 번역하지 마라",
    "- 한글 표기와 로마자 표기가 둘 다 있으면 **한글 표기**를 쓴다 (예: 제목이 `아이브 장원영 직캠 IVE JANGWONYOUNG`이면 `장원영`)",
    // 소속 표기 통일(2026-08-28 대표 확정, name-i18n-gap.md ②) — AI 채우기(aiFillCore)와
    // 같은 규칙: 영문 공식명이 있으면 그걸 쓰고, 없으면 제목·채널에 적힌 원문 그대로,
    // 그마저 없으면(솔로·소속 미표기) 빈칸.
    "- affiliation: 그룹·팀·채널명. **영문(로마자) 공식 표기가 있으면 그걸 쓴다** (예: aespa · IVE · BLACKPINK)",
    "- 공식 로마자 표기가 없는 팀·채널이면 제목·채널에 적힌 원문 그대로 쓴다. 솔로 활동가이거나 제목·채널에 소속이 드러나지 않으면 빈 문자열로 비운다",
    "- nationality: ISO 3166-1 alpha-2 두 글자 대문자. **제목만 보고 국적을 추측하지 마라** — 확실하지 않으면 비운다",
    "- confident: name을 확신하면 true, 비웠거나 애매하면 false",
    "",
    "- 목록에 있는 id만 쓴다. 새 id를 만들지 마라",
    "- 줄 수와 결과 수를 같게 한다",
    "- 설명·머리말 없이 JSON 한 줄만 출력한다",
    "",
    "출력 형식:",
    '{"extractions":[{"id":"<id>","name":"","affiliation":"","nationality":"","confident":false}]}',
    "",
    "목록:",
    rows,
  ].join("\n");
}

/**
 * 모델 응답 → 항목별 결과.
 *
 * 파싱 실패·누락 id는 **보수적으로 빈 결과**다: 못 읽은 칸은 "수동 필요"로 남아
 * 사람에게 가는 게, 엉뚱한 값이 들어가는 것보다 낫다. 요청한 id만 살린다 —
 * 모델이 만들어 낸 id는 버린다.
 */
export function parseExtractions(
  raw: string,
  items: readonly ExtractItem[],
): ExtractedContestant[] {
  const blank = (videoId: string): ExtractedContestant => ({
    videoId,
    name: "",
    affiliation: "",
    nationality: "",
    confident: false,
  });

  const byId = new Map<string, ExtractedContestant>();
  const text = (raw ?? "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1)) as {
        extractions?: unknown;
      };
      const list = Array.isArray(parsed.extractions) ? parsed.extractions : [];
      for (const entry of list) {
        const o = (entry ?? {}) as Record<string, unknown>;
        const videoId = toStr(o.id) || toStr(o.videoId);
        if (!videoId) continue;
        const name = toStr(o.name);
        // 이름이 비면 confident는 무조건 false다 — 모델이 true를 줘도 믿지 않는다.
        const confident = name !== "" && o.confident === true;
        byId.set(videoId, {
          videoId,
          name: confident ? name : "",
          affiliation: toStr(o.affiliation),
          nationality: normalizeCountry(toStr(o.nationality)),
          confident,
        });
      }
    } catch {
      // 형식이 깨졌으면 전부 빈 결과 — 아래 map이 채운다.
    }
  }

  return items.map((it) => byId.get(it.videoId) ?? blank(it.videoId));
}

export interface ExtractInput {
  uid: string | null | undefined;
  items: unknown;
}

export async function extractContestantsCore(
  input: ExtractInput,
  deps: ExtractDeps,
): Promise<ExtractedContestant[]> {
  if (!input.uid) {
    throw new ExtractError("unauthenticated", "로그인이 필요합니다.");
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new ExtractError("invalid-argument", "추출할 영상이 없습니다.");
  }
  if (input.items.length > MAX_EXTRACT_ITEMS) {
    throw new ExtractError(
      "invalid-argument",
      `한 번에 최대 ${MAX_EXTRACT_ITEMS}건까지 처리할 수 있습니다.`,
    );
  }

  const items: ExtractItem[] = [];
  for (const raw of input.items) {
    const o = (raw ?? {}) as Record<string, unknown>;
    const videoId = toStr(o.videoId);
    if (!videoId) continue;
    items.push({
      videoId,
      title: toStr(o.title),
      channelTitle: toStr(o.channelTitle),
    });
  }
  if (items.length === 0) {
    throw new ExtractError("invalid-argument", "videoId가 있는 항목이 없습니다.");
  }

  let text: string;
  try {
    text = await deps.createMessage(buildExtractPrompt(items));
  } catch (e) {
    deps.logError?.("extractContestantsCore createMessage failed", e);
    throw new ExtractError("ai-failed", "AI 호출에 실패했습니다.");
  }

  const out = parseExtractions(text, items);
  const named = out.filter((x) => x.confident).length;
  deps.logInfo?.(
    `extractContestants: ${items.length}건 중 이름 확정 ${named}건 · 수동 필요 ${items.length - named}건`,
  );
  return out;
}
