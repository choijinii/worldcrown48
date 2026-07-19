/**
 * /arena/[tournamentId]/ranking — the RANKING tab destination.
 *
 * Thin glue (E2E-covered): subscribes to the single `ranking_cache/{tournamentId}`
 * doc via onSnapshot (one client read — DevTools verifies; §10.2 step 7) and reads
 * the Tournament doc once for the title + deadline chip. Maps the cache to one of
 * four RankingView states. NEVER renders voteCount (Vote Count 금지, trap #7) — it
 * only passes `rate` rows down. RTDB is never used.
 *
 * W-7 Deadline gate (defense in depth): BEFORE the Tournament Deadline the ranking
 * is "locked" — the UI shows RankLocked and firestore.rules independently denies
 * the read (a legit popular-vote ranking pre-close would skew 표심). The cache is
 * only surfaced once `tournamentDeadline` has passed.
 */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useI18n } from "@/lib/i18n";
import { localizedTitle } from "@/lib/tournamentTitle";
import { RankingView, type RankState } from "@/components/ranking/RankingView";
import { ModuleNav } from "@/components/arena/ModuleNav";
import type { RankingCache } from "@/lib/ranking/rankingTypes";
import type { LocalizedText } from "@/lib/types/tournament";

const LABELS = {
  ko: {
    kicker: "랭킹 · RANKING",
    note: "VOTE RATE (%) · 투표 완료 후 공개",
    deadlineLabel: "토너먼트 마감",
    emptyTitle: "아직 랭킹이 없어요",
    emptySubtitle: "투표가 모이면 Vote Rate 랭킹이 여기에 표시됩니다",
    lockedTitle: "토너먼트 진행 중",
    lockedSub: "마감 후 공개됩니다",
  },
  en: {
    kicker: "RANKING",
    note: "VOTE RATE (%) · published after vote close",
    deadlineLabel: "Tournament Deadline",
    emptyTitle: "No ranking yet",
    emptySubtitle: "vote to reveal the ranking",
    lockedTitle: "Tournament in progress",
    lockedSub: "Published after the tournament closes",
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

/** Milliseconds of `tournamentDeadline` — undefined = unloaded, null = no field. */
function deadlineMillis(value: unknown): number | null {
  const ts = value as { toMillis?: () => number } | null | undefined;
  return ts?.toMillis ? ts.toMillis() : null;
}

function deriveState(
  cache: RankingCache | null | undefined,
  deadlineMs: number | null | undefined,
  nowMs: number,
): RankState {
  if (cache === undefined || deadlineMs === undefined) return "loading";
  // W-7: still open → locked (the cache, if any, stays sealed).
  if (deadlineMs !== null && deadlineMs > nowMs) return "locked";
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
  const [titleI18n, setTitleI18n] = useState<Partial<LocalizedText> | undefined>(
    undefined,
  );
  const [deadlineText, setDeadlineText] = useState<string | null>(null);
  // undefined = Tournament doc not loaded yet; null = no deadline field.
  const [deadlineMs, setDeadlineMs] = useState<number | null | undefined>(
    undefined,
  );

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
      if (!alive) return;
      if (!snap.exists()) {
        setDeadlineMs(null);
        return;
      }
      const data = snap.data();
      setTitle((data.title as string) ?? "");
      setTitleI18n(
        typeof data.titleI18n === "object" && data.titleI18n !== null
          ? (data.titleI18n as Partial<LocalizedText>)
          : undefined,
      );
      setDeadlineText(formatDeadline(data.tournamentDeadline));
      setDeadlineMs(deadlineMillis(data.tournamentDeadline));
    });
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const state = deriveState(cache, deadlineMs, Date.now());
  const entries = cache?.rankings ?? [];
  const displayTitle = localizedTitle({ title, titleI18n }, lang);

  return (
    <>
      <ModuleNav tournamentId={tournamentId} />
      <RankingView
        state={state}
        title={displayTitle}
        deadlineText={deadlineText}
        entries={entries}
        labels={labels}
      />
    </>
  );
}
