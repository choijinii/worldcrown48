/**
 * 열린 매치 무대 · 크라운 카드 화면도 1분 안에 (IMAGE-1 PR 3 · 원장 D-77 · D-93).
 *
 * 아레나는 엔트리를 들어올 때 한 번 읽는다(voteStore.loadTournament). 그래서 판 도중에 엔트리를 내리면 화면이
 * 옛 그림을 들고 있다. 내리기 함수는 대회 문서에 `mediaTakedownAt`(내린 시각)을 쓴다 — 여기서 대회 문서 하나만
 * 구독하다가 그 값이 바뀌면 엔트리를 다시 읽어 **media 만** 갈아 끼운다. 대진(엔트리 id · 순서 · 선택 기록)은
 * 그대로라 판이 끊기지 않고, 내린 엔트리는 이니셜 칸으로 계속 나오고 고를 수 있다.
 *
 * 비용: 대회 문서 구독 1건(바뀔 때만 읽힘) + 내릴 때만 엔트리 48건. 엔트리 48건을 늘 구독하는 것보다 싸다.
 */
"use client";

import { useEffect } from "react";
import { collection, doc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Contestant } from "@/lib/types/tournament";
import { useVoteStore } from "./voteStore";

type Media = Contestant["media"];

/** 엔트리 목록에서 media 만 바꾼다. 바뀐 것이 없으면 같은 배열을 돌려준다. */
export function mergeMedia(contestants: Contestant[], fresh: ReadonlyMap<string, Media>): Contestant[] {
  let changed = false;
  const next = contestants.map((c) => {
    if (!fresh.has(c.id)) return c;
    const m = fresh.get(c.id);
    if (JSON.stringify(m ?? null) === JSON.stringify(c.media ?? null)) return c;
    changed = true;
    const { media: _old, ...rest } = c;
    return (m ? { ...rest, media: m } : rest) as Contestant;
  });
  return changed ? next : contestants;
}

async function refetchMedia(tournamentId: string): Promise<Map<string, Media>> {
  const snap = await getDocs(
    query(collection(getDb(), "contestants"), where("tournamentId", "==", tournamentId), orderBy("order")),
  );
  return new Map(snap.docs.map((d) => [d.id, (d.data() as { media?: Media }).media]));
}

/** 아레나(매치 무대 · 크라운 카드 화면)에서 부른다. 엔트리를 아직 못 읽었으면 기다린다. */
export function useTakedownRefresh(tournamentId: string | undefined): void {
  const loaded = useVoteStore((s) => s.tournament?.id === tournamentId && s.contestants.length > 0);
  useEffect(() => {
    if (!tournamentId || !loaded) return;
    let seen: unknown = (useVoteStore.getState().tournament as { mediaTakedownAt?: unknown } | null)?.mediaTakedownAt ?? null;
    let alive = true;
    const unsub = onSnapshot(
      doc(getDb(), "tournaments", tournamentId),
      (snap) => {
        const at = snap.get("mediaTakedownAt") ?? null;
        if (at === seen) return;
        seen = at;
        refetchMedia(tournamentId)
          .then((fresh) => {
            if (!alive) return;
            useVoteStore.setState((s) => ({ contestants: mergeMedia(s.contestants, fresh) }));
          })
          .catch((err) => console.warn("[arena] takedown refresh failed", err));
      },
      // 숨긴 대회는 규칙이 읽기를 거절한다 — 화면은 이미 읽은 그대로 둔다.
      (err) => console.warn("[arena] takedown watch stopped", err),
    );
    return () => {
      alive = false;
      unsub();
    };
  }, [tournamentId, loaded]);
}
