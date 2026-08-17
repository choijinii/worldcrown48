/**
 * sourcingRequest — 자동 소싱 콜러블의 입력 검증 (LAB-EV-2 §5 B).
 *
 * 콜러블 URL은 devtools에서 직접 부를 수 있다(requireAdmin이 1차 방어). 그 뒤에도
 * "targets 500개"가 들어오면 배치 상한(R5)과 쿼터 가드(R4)가 동시에 무의미해지므로,
 * 모델·API를 만나기 전에 모양을 강제한다.
 *
 * 순수 모듈이다 — 네트워크·Firestore를 모른다. InspectError를 던져 기존
 * `toHttpsError`(validateYouTubeLinks) 매핑을 그대로 탄다.
 */
import { InspectError } from "./inspectCore";
import { TOTAL_CONTESTANTS } from "./parseContestants";
import { isValidVideoId } from "../_embed/youtubeUrl";
import { MAX_BATCH_TARGETS } from "../_embed/sourcing/pipeline";
import type { SourcingTarget } from "../_embed/sourcing/types";

/** 검색어 힌트 상한 — 이보다 길면 검색어가 아니라 본문이다. */
const MAX_HINT_LENGTH = 200;
/** 키워드 상한 — lib/lab/keywordsValidation과 같은 값. */
const MAX_KEYWORDS = 12;
const MAX_KEYWORD_LENGTH = 30;

export interface SourcingRequest {
  targets: SourcingTarget[];
  categoryKeywords: string[];
  excludeVideoIds: string[];
  /** true면 쿼터 추정만 계산하고 API를 부르지 않는다(확인 다이얼로그). */
  dryRun: boolean;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * 드라이런은 API를 안 부르므로 풀 전체(48)를 한 번에 받아 "예상 검색 콜 · 잔여"를
 * 계산할 수 있다. 실행은 R5대로 배치당 MAX_BATCH_TARGETS까지.
 * (R2 — 48 리터럴이 아니라 TOTAL_CONTESTANTS에서 파생한다)
 */
export function maxTargetsFor(dryRun: boolean): number {
  return dryRun ? TOTAL_CONTESTANTS : MAX_BATCH_TARGETS;
}

export function parseSourcingRequest(data: unknown): SourcingRequest {
  const raw = (data ?? {}) as Record<string, unknown>;
  const dryRun = raw.dryRun === true;

  if (!Array.isArray(raw.targets) || raw.targets.length === 0) {
    throw new InspectError("invalid-argument", "소싱할 후보가 없습니다.");
  }
  const limit = maxTargetsFor(dryRun);
  if (raw.targets.length > limit) {
    throw new InspectError(
      "invalid-argument",
      `한 번에 최대 ${limit}명까지 처리할 수 있습니다.`,
    );
  }

  const seen = new Set<number>();
  const targets: SourcingTarget[] = raw.targets.map((t) => {
    const index = Number((t as { index?: unknown })?.index);
    if (!Number.isInteger(index) || index < 0 || index >= TOTAL_CONTESTANTS) {
      throw new InspectError("invalid-argument", `슬롯 번호가 범위 밖입니다: ${String(index)}`);
    }
    if (seen.has(index)) {
      throw new InspectError("invalid-argument", `슬롯 ${index + 1}이 중복됐습니다.`);
    }
    seen.add(index);

    const name = asString((t as { name?: unknown })?.name);
    if (!name) {
      throw new InspectError("invalid-argument", `슬롯 ${index + 1}에 이름이 없습니다.`);
    }
    const searchHint = asString((t as { searchHint?: unknown })?.searchHint).slice(
      0,
      MAX_HINT_LENGTH,
    );
    return searchHint ? { index, name, searchHint } : { index, name };
  });

  const categoryKeywords = (Array.isArray(raw.categoryKeywords) ? raw.categoryKeywords : [])
    .map(asString)
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)
    .map((k) => k.slice(0, MAX_KEYWORD_LENGTH));

  // 잘못된 id는 조용히 버린다 — 중복 회피 목록이지 검증 대상이 아니다. 상한은
  // 풀 크기: 한 토너먼트가 가질 수 있는 영상 수가 그만큼이다.
  const excludeVideoIds = (Array.isArray(raw.excludeVideoIds) ? raw.excludeVideoIds : [])
    .filter((id) => isValidVideoId(id))
    .slice(0, TOTAL_CONTESTANTS) as string[];

  return { targets, categoryKeywords, excludeVideoIds, dryRun };
}
