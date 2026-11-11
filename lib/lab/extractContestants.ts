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

export interface ExtractItem {
  videoId: string;
  title: string;
  channelTitle: string;
}

/**
 * `entryUnit` = 대회의 엔트리 단위(원장 D-73 · LAB-FIX-2). 팀이면 서버가 그룹을 읽는 지시문을 쓴다.
 */
export async function extractContestantsFromVideos(
  items: ExtractItem[],
  entryUnit: EntryUnit,
): Promise<ExtractedContestant[]> {
  const callable = httpsCallable<
    { items: ExtractItem[]; entryUnit: EntryUnit },
    { extractions: ExtractedContestant[] }
  >(getFunctionsInstance(), "extractContestantsFromVideos");
  const res = await callable({ items, entryUnit });
  return res.data.extractions ?? [];
}
