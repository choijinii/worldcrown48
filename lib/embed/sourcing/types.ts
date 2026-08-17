/**
 * types — 자동 영상 소싱의 공용 계약 (LAB-EV-2 §5 A).
 *
 * 콜러블의 입·출력이자 순수 파이프라인의 계약이다. **영상 필드를 여기서 만들지
 * 않는다** — 슬롯에 실릴 videoId·시작초·출처 URL은 LAB-EV-1의 `buildVideoFields`
 * 하나가 만든다(R3 복제 금지). 그래서 이 층은 "어떤 판정의 어떤 영상을 몇 초부터"
 * 까지만 정하고, 병합은 클라이언트의 lib/lab 층이 기존 경로로 한다.
 */
import type { LinkVerdict } from "../verdict";

/** 소싱 대상 슬롯 하나. */
export interface SourcingTarget {
  /** 0-based 그리드 index (슬롯 번호 = index + 1). */
  index: number;
  name: string;
  /**
   * AI가 STEP 2에서 남긴 검색어 힌트(`imageSearchKeyword`,
   * 예 "BLACKPINK Jisoo stage performance"). 있으면 그대로 쓴다 — §3 OUT에
   * "검색어 AI 재작성" 금지가 박혀 있다.
   */
  searchHint?: string;
}

/** search.list 결과 한 건 (part=snippet에서 필요한 것만). */
export interface SearchCandidate {
  videoId: string;
  title: string;
  channelTitle: string;
}

/**
 * SearchProvider — 검색 백엔드의 계약 (§3 OUT "저가 검색 API 백업 경로: 설계 훅만").
 *
 * 지금 구현은 YouTube search.list 하나뿐이다. 이 인터페이스는 나중에 값싼 검색 API를
 * 앞단에 끼울 자리를 남겨둔 것이지, 지금 두 번째 구현을 만들라는 뜻이 아니다.
 * 파이프라인은 이 계약만 알고 있으므로 교체 지점이 한 곳으로 고정된다.
 */
export interface SearchProvider {
  /** 로그·실측 표에서 이 제공자를 식별하는 이름. */
  readonly name: string;
  search(query: string, maxResults: number): Promise<SearchCandidate[]>;
}

/**
 * 슬롯 결과 상태 — 그리드 배지 3종과 1:1이다.
 *   suggested      — 제안(초록/금). 운영자가 훑고 [토너먼트 생성]을 누른다(R6)
 *   manual         — 수동 필요(빨강) + 사유
 *   unknown-person — 실존 의심. 검색 0건은 "영상이 없다"가 아니라 대개 "그런 사람이
 *                    없다"는 신호다(§1 설계 결정 ⑤ · AI-1 허구 인물 사고의 후속)
 */
export type SlotSourcingStatus = "suggested" | "manual" | "unknown-person";

/** 실패 사유 — UI 문구 키로 그대로 매핑된다(embedMessages 방식). */
export type SourcingFailureReason =
  /** search.list가 0건 — 실존 의심. */
  | "no-results"
  /** 후보는 있었으나 전부 차단 판정(embeddable=false·비공개·삭제). */
  | "all-blocked"
  /** 후보는 있었으나 이름/그룹과 관련이 없었다. */
  | "not-relevant"
  /** 남은 후보가 전부 이 토너먼트의 다른 슬롯에 이미 쓰였다. */
  | "all-duplicate"
  /** 검색 자체가 실패(업스트림). 슬롯 단위 격리 — 배치 전체를 죽이지 않는다(R5). */
  | "search-failed";

export interface SourcingResult {
  index: number;
  status: SlotSourcingStatus;
  /** suggested일 때의 판정 — 클라이언트가 buildVideoFields에 그대로 넘긴다. */
  verdict?: LinkVerdict;
  /** suggested일 때의 루프 시작 초(휴리스틱). 정밀 추천은 슬롯 미세조정에서. */
  startSec?: number;
  /** suggested가 아닐 때의 사유. */
  reason?: SourcingFailureReason;
  /** 실제로 검사한 후보 수 (0 = 검색 0건). */
  attempted: number;
  /** 후보 목록을 캐시에서 가져왔는가 — §8 B 캐시 적중률의 원천. */
  cacheHit: boolean;
  /** 규칙만으로 판정 못 해 AI 판정으로 넘어간 후보 수 (§6 Auto-STOP 3번 계측). */
  ambiguous: number;
}

/** 배치 1회의 요약 — 진행률 UI와 §8 B 실측 표가 읽는다. */
export interface SourcingBatchSummary {
  results: SourcingResult[];
  /** 이번 배치가 실제로 소비한 양(예약분과 다르면 카운터를 되돌린다). */
  spent: { searchCalls: number; units: number };
  /** 예약한 양 — 실측 표의 "예약 vs 실사용" 대조용. */
  reserved: { searchCalls: number; units: number };
  /** 캐시에서 후보를 가져온 슬롯 수. */
  cacheHits: number;
  /** AI 판정으로 넘어간 후보 총수. */
  aiJudged: number;
}
