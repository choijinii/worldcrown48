"use client";

/**
 * ContinuePill — "선택 이어가기" 알약 (NAV-1 E · 원장 D-18 · 정본 1 · 2 · 6 · 7).
 *
 * 메뉴 층 바로 아래, 오른쪽 끝(아바타와 세로 정렬). 끝내지 않은 대결이 없으면 알약도 자리도 없다.
 * 그 대회의 매치 화면 안에서는 숨긴다.
 *
 * 판정 = 이 브라우저의 메모(lib/run/continueMemo) — **Firestore 읽기 0**(R7). 원장 D-18 의
 * "새 저장소 없음"은 대표 결정(2026-10-11)으로 "서버 저장소 없음 · 브라우저 메모만"이 됐다.
 * 그래서 같은 기기에서만 이어갈 수 있고, 그 사실을 설명 한 줄로 알린다(대표 승인 문구):
 *   · 데스크톱 — 알약에 마우스를 올리거나 키보드 초점이 가면 설명이 뜬다.
 *   · 휴대폰 세로 — 알약 바로 아래에 작은 글씨로 늘 보인다. **정본에 없는 요소(정본 외 추가)** —
 *     대표 눈검사 전까지 PR 에 그렇게 표시한다.
 *   · 두 경우 모두 같은 문장을 `aria-describedby` 로 연결한다.
 *
 * 첫 렌더는 서버와 같게 빈 채로 시작하고(하이드레이션), 마운트 뒤 메모를 읽는다.
 */
import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import {
  CONTINUE_MEMO_EVENT,
  continuePillHref,
  readContinueMemo,
  type ContinueMemo,
} from "@/lib/run/continueMemo";

export function ContinuePill({ pathname }: { pathname: string }): JSX.Element | null {
  const { t } = useT();
  const noteId = useId();
  const [memo, setMemo] = useState<ContinueMemo | null>(null);

  useEffect(() => {
    const read = () => setMemo(readContinueMemo());
    read();
    window.addEventListener(CONTINUE_MEMO_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(CONTINUE_MEMO_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [pathname]);

  const href = continuePillHref(memo, pathname, Date.now());
  if (!href) return null;

  return (
    // `wc-nav` — 무대(가로 집중 모드 · 라운드 전환)가 메뉴를 숨길 때 알약도 같이 숨는다.
    <div className="wc-nav wc-pill-layer">
      <div className="wc-pill-inner">
        <Link href={href} className="wc-pill" aria-describedby={noteId} data-testid="continue-pill">
          {t("nav.pill.label")}
        </Link>
        <span id={noteId} role="tooltip" className="wc-pill-note" data-testid="continue-pill-note">
          {t("nav.pill.note")}
        </span>
      </div>
    </div>
  );
}
