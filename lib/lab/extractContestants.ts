/**
 * extractContestants — 붙여넣은 링크의 제목 → 인물 추출 콜러블 배선 (LAB-UX-1 ③).
 *
 * 검수기가 이미 받아 둔 `title`·`channelTitle`만 보낸다. YouTube API를 한 콜도 더
 * 쓰지 않고, 비용은 Haiku 1콜뿐이다.
 *
 * 실패를 조용히 삼키지 않는다(autoSource.ts와 같은 원칙): 추출이 실패해도 **영상
 * 주입은 이미 끝났으므로** 호출부가 빈 결과로 이어가고 그 칸들은 "수동 필요"가
 * 된다. 그게 "링크는 들어갔는데 아무 일도 안 일어난 것처럼 보이는" 상태보다 낫다.
 */
import { httpsCallable } from "firebase/functions";
import { getFunctionsInstance } from "@/lib/firebase";
import type { ExtractedContestant } from "@/lib/lab/pasteExtract";
import type { EntryUnit } from "@/lib/types/tournament";
import { aiBriefForSave, type AiBrief } from "@/lib/lab/aiBrief";

export interface ExtractItem {
  videoId: string;
  title: string;
  channelTitle: string;
}

/** LAB-FIX-4 — "AI에게 알려 줄 내용" 묶음과 대회 제목 · 설명(AI 가 대회가 무엇을 뽑는지 알게). */
export interface ExtractExtras {
  aiBrief?: AiBrief;
  tournamentTitle?: string;
  tournamentDescription?: string;
}

/**
 * 서버로 보낼 덧붙임 — 묶음 지시문을 쓸 때(묶음이 있거나 단위가 그 외)만 싣는다. 아니면 빈 객체(지금과 같은 요청).
 * 대회 제목 · 설명은 묶음 지시문에만 쓰이므로 그때만 함께 보낸다.
 */
export function extractRequestExtras(extras: ExtractExtras | undefined, entryUnit: EntryUnit): {
  aiBrief?: AiBrief;
  tournamentTitle?: string;
  tournamentDescription?: string;
} {
  const brief = extras?.aiBrief ? aiBriefForSave(extras.aiBrief) : undefined;
  if (!brief && entryUnit !== "other") return {};
  return {
    ...(brief ? { aiBrief: brief } : {}),
    ...(extras?.tournamentTitle?.trim() ? { tournamentTitle: extras.tournamentTitle.trim() } : {}),
    ...(extras?.tournamentDescription?.trim() ? { tournamentDescription: extras.tournamentDescription.trim() } : {}),
  };
}

/** Sonnet 이 48줄을 읽는 시간(서버 120초) — 브라우저 기본 70초보다 길게 기다린다(LAB-FIX-4 결정 E). */
const EXTRACT_TIMEOUT_MS = 130_000;

/**
 * `entryUnit` = 대회의 엔트리 단위(원장 D-73 · LAB-FIX-2). 팀이면 서버가 그룹을 읽는 지시문을 쓴다.
 * `extras` = LAB-FIX-4 묶음 · 대회 제목 · 설명. 묶음이 있거나 단위가 그 외면 서버가 묶음 지시문을 쓴다.
 */
export async function extractContestantsFromVideos(
  items: ExtractItem[],
  entryUnit: EntryUnit,
  extras?: ExtractExtras,
): Promise<ExtractedContestant[]> {
  const callable = httpsCallable<
    { items: ExtractItem[]; entryUnit: EntryUnit } & ReturnType<typeof extractRequestExtras>,
    { extractions: ExtractedContestant[] }
  >(getFunctionsInstance(), "extractContestantsFromVideos", { timeout: EXTRACT_TIMEOUT_MS });
  const res = await callable({ items, entryUnit, ...extractRequestExtras(extras, entryUnit) });
  return res.data.extractions ?? [];
}
