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
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { kstHour, nextRankingUpdate } from "@/lib/ranking/nextRankingUpdate";
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

/**
 * 🛑 "다음 발표" 한 줄의 **노출 보류 스위치** (2026-09-10 대표 확정).
 *
 * 판정 함수·§8 승인 문구 2키·단위 테스트 19건은 전부 들어가 있고, 막힌 것은 화면 노출뿐이다.
 * 이 화면에서는 그 문구가 사실이 될 수 없기 때문이다:
 *   · `firestore.rules` 는 `ranking_cache` 를 **마감 후에만** 읽게 한다 (W-7)
 *   · 아래 `deriveState` 도 마감 전이면 `locked` 로 숫자를 감춘다
 *   · `functions/src/scheduleRankingCache.ts` 는 **마감 전** 대회만 집계한다
 * → 팬이 숫자를 볼 수 있는 순간, 그 캐시는 다시 갱신될 일이 없다. "다음 발표: 오늘 21:00" 은
 *   그 자리에서 늘 거짓이고, 이 줄을 넣은 목적(멈춘 숫자를 고장으로 읽지 않게)이 거꾸로 뒤집힌다.
 *
 * 마감 전 랭킹 공개(W-7) 여부는 제품 결정(표심 왜곡 방지 · ADR-0006 계열)이라 이 PR의 범위가
 * 아니다. 그 결정이 나면 **이 한 줄을 `true` 로 바꾸는 것만으로** 되살아난다.
 */
const SHOW_NEXT_UPDATE_LINE = false;

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
  // 위 LABELS 는 ko/en 2언어뿐이다. "다음 발표" 한 줄은 3언어가 요건(AC 15)이라 카탈로그
  // (`lib/i18n/messages.ts`)에서 뽑는다 — es 가 여기서 나온다.
  const { t } = useT();
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

  // ── "다음 발표" 한 줄 (AC 15) ──────────────────────────────────────────
  // 시각은 **마운트 후에** 읽는다. 렌더 중에 읽으면 서버가 그린 HTML과 브라우저가 계산한
  // 값이 시(hour) 경계에서 갈려 하이드레이션이 어긋난다. 캐시 스냅샷이 바뀔 때 함께 다시
  // 세므로, 21:00 발표가 도착하는 순간 줄도 "내일 09:00" 으로 따라 바뀐다.
  const [hourKST, setHourKST] = useState<number | null>(null);
  useEffect(() => {
    setHourKST(kstHour(new Date()));
  }, [cache]);
  const nextUpdateKey = hourKST === null ? null : nextRankingUpdate(hourKST);
  // null = 승인 문구가 없는 새벽 구간(KST 00:00~08:59) → 줄을 감춘다. 문구를 지어내지 않는다.
  const nextUpdateCopy =
    nextUpdateKey === "today"
      ? t("ranking.nextUpdate.today")
      : nextUpdateKey === "tomorrow"
        ? t("ranking.nextUpdate.tomorrow")
        : null;

  // 노출 보류 — 사유는 SHOW_NEXT_UPDATE_LINE 위 주석.
  const nextUpdateText: string | null = SHOW_NEXT_UPDATE_LINE
    ? nextUpdateCopy
    : null;

  return (
    <>
      <ModuleNav tournamentId={tournamentId} />
      <RankingView
        state={state}
        title={displayTitle}
        deadlineText={deadlineText}
        entries={entries}
        labels={labels}
        nextUpdateText={nextUpdateText}
      />
    </>
  );
}
