/**
 * /arena/[tournamentId]/ranking — **차트** 화면 (주소·폴더 이름은 그대로 둔다).
 *
 * 얇은 접착층: `ranking_cache/{tournamentId}` 한 문서를 onSnapshot 으로 구독하고
 * (클라이언트 읽기 1회), Tournament 문서를 한 번 읽어 제목·마감 칩을 만든다. 캐시를
 * 세 가지 RankingView 상태로 옮긴다. `voteCount` 는 절대 그리지 않는다 (Vote Count
 * 금지 · trap #7). RTDB는 쓰지 않는다.
 *
 * ## 바뀐 것 — D-30 (2026-09-23 대표)
 *
 * 마감 전 잠금(W-7)이 **폐기**됐다. 차트는 마감 전에도, 로그인하지 않아도 열린다.
 * `firestore.rules` 의 마감 게이트도 같은 PR에서 지웠다 — 둘 중 하나만 고치면 화면은
 * 열렸는데 읽기가 막힌다.
 *
 * ## 바뀐 것 — Crown Score v1.0 (정본 CROWN_SCORE_v1.0.md)
 *
 * 화면에 나가는 수치는 Crown Score 정수 하나뿐이다. 세 비율은 캐시에 실려 오지만
 * 그리지 않는다. 완주 판수가 10에 닿기 전에는 점수 대신 기다림 안내를 보여 주되
 * **차트로 가는 길은 숨기지 않는다**(정본 §5).
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
import {
  deriveRankState,
  resolveHelpText,
  showNextUpdateLine,
} from "@/lib/ranking/rankState";
import { RankingView } from "@/components/ranking/RankingView";
import { ModuleNav } from "@/components/arena/ModuleNav";
import type { RankingCache } from "@/lib/ranking/rankingTypes";
import type { LocalizedText } from "@/lib/types/tournament";

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


export default function RankingPage(): JSX.Element {
  const tournamentId = String(useParams().tournamentId);
  const { lang } = useI18n();
  // 위 LABELS 는 ko/en 2언어뿐이다. "다음 발표" 한 줄은 3언어가 요건(AC 15)이라 카탈로그
  // (`lib/i18n/messages.ts`)에서 뽑는다 — es 가 여기서 나온다.
  const { t } = useT();
  // 문구는 전부 3언어 카탈로그에서 온다. 예전에는 이 파일 안에 ko·en 두 벌이 박혀 있어
  // es 팬이 영어를 봤다 — 차트 이름의 es 는 마케팅 문안 대기다(§5 승인표 A6).
  const labels = {
    kicker: t("chart.kicker"),
    note: t("chart.note"),
    // 요약 1줄 + 항목 3줄로 쪼개 넘긴다 (마케팅 2026-09-24 승인본).
    helpLines: resolveHelpText(t("chart.score.help")),
    deadlineLabel: lang === "ko" ? "토너먼트 마감" : "Tournament Deadline",
    waitingTitle: t("chart.waiting.title"),
  };

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

  const state = deriveRankState(cache);
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

  // D-30 전에는 이 줄이 **늘 거짓말**이었다(팬이 숫자를 보는 시점엔 캐시가 더 갱신되지
  // 않았다). 상시 공개가 되어 사실이 됐으므로 켠다. 마감 뒤에는 다시 감춘다 — 그때부터는
  // 더 발표되지 않는다. 새벽(KST 00:00~08:59)은 승인 문구가 없어 줄 자체를 감춘다.
  const nextUpdateText: string | null = showNextUpdateLine(deadlineMs, Date.now())
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
