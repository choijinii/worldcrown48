/**
 * Tournament 초안 — `tournamentDrafts/{draftId}` 의 모양 (EDITOR-FIX-1).
 *
 * 초안 = 아직 발행하지 않은 편집 내용. 발행(publish)이 성공하면 같은 writeBatch 에서
 * 지워진다. 발행된 대회(`tournaments`)와 **다른 컬렉션**이다 — `status: "draft"` 로
 * 섞으면 대회 목록·차트·사이트맵 쿼리가 초안을 주워 갈 수 있다.
 *
 * 관리자 전용 가정을 데이터에 넣지 않는다: 주인은 `hostUid` 하나뿐이고, 같은 모양을
 * MVP2 의 유저 대회 만들기가 그대로 쓴다. 접근 문(The Lab)만 지금 관리자 화면이다.
 *
 * 일시 상태(바쁨 표시·할당량 미리보기·소싱 배지)는 싣지 않는다.
 */
import type { ContestantDraft } from "@/lib/lab/tournamentDoc";
import type { EmbedOrientation } from "@/lib/media/mediaSlot";

export const DRAFTS_COLLECTION = "tournamentDrafts";
export const DRAFT_SCHEMA_VERSION = 1;

/** 문서에 있을 수 있는 칸 전부 — firestore.rules 의 hasOnly 와 같은 목록이다. */
export const DRAFT_FIELDS = [
  "hostUid",
  "schemaVersion",
  "step",
  "title",
  "category",
  "description",
  "keywords",
  "campaignSlug",
  "deadlineMs",
  "contestants",
  "updatedAt",
] as const;

export interface DraftEditorState {
  step: 1 | 2;
  title: string;
  category: string;
  description: string;
  keywords: string[];
  campaignSlug: string;
  deadlineMs: number;
  contestants: ContestantDraft[];
}

/** 목록에 보여 줄 한 줄. */
export interface DraftSummary {
  id: string;
  title: string;
  updatedAtMs: number;
}

function stripUndefined<T extends object>(o: T): T {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as T;
}

/** 저장할 칸(hostUid·updatedAt 은 저장소가 붙인다). */
export function toDraftFields(s: DraftEditorState): Record<string, unknown> {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    step: s.step,
    title: s.title,
    category: s.category,
    description: s.description,
    keywords: [...s.keywords],
    campaignSlug: s.campaignSlug,
    deadlineMs: s.deadlineMs,
    contestants: s.contestants.map((c) => stripUndefined({ ...c })),
  };
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

function toContestant(raw: unknown): ContestantDraft {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const orientation =
    r.videoOrientation === "landscape" || r.videoOrientation === "portrait"
      ? (r.videoOrientation as EmbedOrientation)
      : undefined;
  return stripUndefined({
    name: str(r.name),
    nationality: str(r.nationality),
    affiliation: str(r.affiliation),
    imageSearchKeyword: str(r.imageSearchKeyword),
    videoId: typeof r.videoId === "string" ? r.videoId : undefined,
    videoStartSec: num(r.videoStartSec),
    videoEndSec: num(r.videoEndSec),
    videoSourceUrl: typeof r.videoSourceUrl === "string" ? r.videoSourceUrl : undefined,
    videoOrientation: orientation,
    videoFocusY: num(r.videoFocusY),
  });
}

/** 문서 → 편집기 상태. 초안이 아니면 null. 빠진 칸은 기본값(옛 문서 대비). */
export function fromDraftDoc(data: unknown): DraftEditorState | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.hostUid !== "string") return null;
  return {
    step: d.step === 2 ? 2 : 1,
    title: str(d.title),
    category: str(d.category),
    description: str(d.description),
    keywords: Array.isArray(d.keywords)
      ? d.keywords.filter((k): k is string => typeof k === "string")
      : [],
    campaignSlug: str(d.campaignSlug),
    deadlineMs: num(d.deadlineMs) ?? 0,
    contestants: Array.isArray(d.contestants) ? d.contestants.map(toContestant) : [],
  };
}

function contestantTouched(c: ContestantDraft): boolean {
  return (
    [c.name, c.nationality, c.affiliation, c.imageSearchKeyword].some((x) => x.trim() !== "") ||
    Boolean(c.videoId)
  );
}

/**
 * 아무것도 입력하지 않은 상태 — 이때는 초안을 만들지 않는다(빈 초안이 목록을 채우지
 * 않게). 단계·마감은 기본값이 늘 있으므로 세지 않는다.
 */
export function isDraftBlank(s: DraftEditorState): boolean {
  return (
    s.title.trim() === "" &&
    s.category === "" &&
    s.description.trim() === "" &&
    s.keywords.length === 0 &&
    s.campaignSlug === "" &&
    !s.contestants.some(contestantTouched)
  );
}

export type DraftPhase = "loading" | "choose" | "edit";

/**
 * 열 때 불러온 초안 목록이 도착했을 때의 화면. **아직 불러오는 중일 때만** 정한다 —
 * 그사이 [새로 시작]을 눌렀으면 늦게 온 목록이 쓰던 편집기를 빼앗으면 안 된다.
 */
export function phaseAfterDraftList(current: DraftPhase, draftCount: number): DraftPhase {
  if (current !== "loading") return current;
  return draftCount > 0 ? "choose" : "edit";
}

/** 가장 최근에 저장한 초안이 위로. 쿼리에 orderBy 를 걸지 않는다(복합 색인 불필요). */
export function sortDraftsByUpdated<T extends { updatedAtMs: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => b.updatedAtMs - a.updatedAtMs);
}
