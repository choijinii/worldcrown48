/**
 * 전광판 대회의 엔트리 48명 읽기 (ARENA-2 PR 1 · 킥 §2-1).
 *
 * 전광판 대회가 바뀔 때마다 그 대회의 엔트리를 번호순으로 읽는다(`tournamentId ==` + `order` —
 * 무대·커버와 같은 쿼리, 색인 이미 있음). 이름은 화면이 `localizedName` 으로 언어를 고른다.
 * 늦게 온 옛 응답은 버린다(대회를 빠르게 바꿔도 앞 대회의 엔트리가 덮지 않게).
 * 읽기 실패는 콘솔 오류로 올리지 않는다 — 빈 목록이 설계된 폴백이다.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { NamedLike } from "@/lib/contestantName";
import type { LocalizedText } from "@/lib/types/tournament";

export interface EntryRow extends NamedLike {
  id: string;
  order: number;
}

export function useEntries(tournamentId: string | null): { entries: EntryRow[]; loading: boolean } {
  const [state, setState] = useState<{ id: string | null; entries: EntryRow[] }>({ id: null, entries: [] });
  const gen = useRef(0);

  useEffect(() => {
    const my = ++gen.current;
    if (!tournamentId) {
      setState({ id: null, entries: [] });
      return;
    }
    getDocs(query(collection(getDb(), "contestants"), where("tournamentId", "==", tournamentId), orderBy("order")))
      .then((snap) => {
        if (gen.current !== my) return;
        const entries = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            order: typeof data.order === "number" ? data.order : 0,
            name: typeof data.name === "string" ? data.name : "",
            nameI18n:
              typeof data.nameI18n === "object" && data.nameI18n !== null
                ? (data.nameI18n as Partial<LocalizedText>)
                : null,
          };
        });
        setState({ id: tournamentId, entries });
      })
      .catch((err) => {
        console.warn("[arenaHome] entries read failed", err);
        if (gen.current === my) setState({ id: tournamentId, entries: [] });
      });
  }, [tournamentId]);

  return { entries: state.id === tournamentId ? state.entries : [], loading: state.id !== tournamentId };
}
