/**
 * /arena/[tournamentId]/ranking — the RANKING tab destination.
 *
 * Thin glue (E2E-covered): subscribes to the single `ranking_cache/{tournamentId}`
 * doc via onSnapshot (one client read — DevTools verifies; §10.2 step 7) and reads
 * the Tournament doc once for the title + deadline chip. Maps the cache to one of
 * four RankingView states. NEVER renders voteCount (Vote Count 금지, trap #7) — it
 * only passes `rate` rows down. RTDB is never used.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { RankingView, type RankState } from "@/components/ranking/RankingView";
import { ModuleNav } from "@/components/arena/ModuleNav";
import type { RankingCache } from "@/lib/ranking/rankingTypes";

const LABELS = {
  ko: {
    kicker: "랭킹 · RANKING",
    note: "VOTE RATE (%) · 투표 완료 후 공개",
    deadlineLabel: "토너먼트 마감",
    emptyTitle: "아직 랭킹이 없어요",
    emptySubtitle: "투표가 모이면 Vote Rate 랭킹이 여기에 표시됩니다",
  },
  en: {
    kicker: "RANKING",
    note: "VOTE RATE (%) · published after vote close",
    deadlineLabel: "Tournament Deadline",
    emptyTitle: "No ranking yet",
    emptySubtitle: "vote to reveal the ranking",
  },
} as const;

/** Wireframe deadline chip format — "2026·06·20". */
function formatDeadline(value: unknown): string | null {
  const ts = value as { toDate?: () => Date } | null | undefined;
  if (!ts?.toDate) return null;
  const d = ts.toDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}·${p(d.getMonth() + 1)}·${p(d.getDate())}`;
}

function deriveState(cache: RankingCache | null | undefined): RankState {
  if (cache === undefined) return "loading";
  if (!cache || cache.rankings.length === 0) return "empty";
  return "loaded";
}

export default function RankingPage(): JSX.Element {
  const tournamentId = String(useParams().tournamentId);
  const { lang } = useI18n();
  const labels = LABELS[lang === "ko" ? "ko" : "en"];

  // undefined = still loading the first snapshot; null = no cache doc yet.
  const [cache, setCache] = useState<RankingCache | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [deadlineText, setDeadlineText] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(getDb(), "ranking_cache", tournamentId);
    const unsub = onSnapshot(
      ref,
      (snap) =>
        setCache(snap.exists() ? (snap.data() as RankingCache) : null),
      () => setCache(null),
    );
    return unsub;
  }, [tournamentId]);

  useEffect(() => {
    let alive = true;
    void getDoc(doc(getDb(), "tournaments", tournamentId)).then((snap) => {
      if (!alive || !snap.exists()) return;
      const data = snap.data();
      setTitle((data.title as string) ?? "");
      setDeadlineText(formatDeadline(data.tournamentDeadline));
    });
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const state = deriveState(cache);
  const entries = cache?.rankings ?? [];

  return (
    <>
      <ModuleNav tournamentId={tournamentId} />
      <RankingView
        state={state}
        title={title}
        deadlineText={deadlineText}
        entries={entries}
        labels={labels}
      />
    </>
  );
}
