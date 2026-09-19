/**
 * useStageViewport — 무대 배치(데스크톱 · 모바일 세로 · 모바일 가로)와 칸 크기 (ARENA-1 PR 1).
 *
 * 규칙은 전부 lib/arena/stageLayout(순수·유닛 테스트)이고, 이 훅은 화면 크기와 무대 윗변
 * 위치를 재서 넘기기만 한다.
 *
 *   · 회전 감지 = matchMedia("(orientation: landscape)") + 폭 1024 기준 (D-17 "자동 전환").
 *   · **배치만 바꾼다.** 진행 중인 판·선택 기록·match_session_id 는 이 훅 밖(voteStore ·
 *     page.tsx)에 있고, 무대 컴포넌트 트리는 회전해도 같은 트리라 리마운트되지 않는다 (D-17 ①).
 *   · 모바일 가로에서 상단 메뉴를 빼는 일은 SplitStage 가 한다(mode 를 읽어서).
 */
"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { computeStageLayout, stageMode, type StageLayout, type StageMode } from "@/lib/arena/stageLayout";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readMode(): StageMode {
  if (typeof window === "undefined") return "desktop";
  return stageMode(window.innerWidth, window.innerHeight);
}

export function useStageViewport(
  frameRef: RefObject<HTMLElement>,
  onOrient?: () => void,
): { mode: StageMode; layout: StageLayout | null } {
  // 서버 HTML 과 첫 클라이언트 렌더는 같아야 한다(hydration) — 둘 다 desktop 으로 시작하고,
  // 그리기 전(layout effect)에 실제 배치로 바꾼다. 폰에서 데스크톱 배치가 번쩍이지 않는다.
  const [mode, setMode] = useState<StageMode>("desktop");
  const [layout, setLayout] = useState<StageLayout | null>(null);

  const measure = useCallback(() => {
    const el = frameRef.current;
    if (!el || typeof window === "undefined") return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    setLayout(
      computeStageLayout({ width: window.innerWidth, height: window.innerHeight, top }),
    );
  }, [frameRef]);

  // 화면 크기·방향 변화 → 배치 다시 계산.
  useEffect(() => {
    const landscape = window.matchMedia("(orientation: landscape)");
    const wide = window.matchMedia("(min-width: 1024px)");
    let last = readMode();
    const onChange = () => {
      const next = readMode();
      if (next !== last) {
        last = next;
        setMode(next);
        onOrient?.();
      }
      measure();
    };
    landscape.addEventListener("change", onChange);
    wide.addEventListener("change", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      landscape.removeEventListener("change", onChange);
      wide.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [measure, onOrient]);

  useIsoLayoutEffect(() => {
    setMode(readMode());
  }, []);

  // 모드가 바뀌면(메뉴가 숨거나 돌아오면) 무대 윗변이 움직인다 — 그린 뒤에 다시 잰다.
  useIsoLayoutEffect(() => {
    measure();
  }, [mode, measure]);

  // 안내 문구 층의 글꼴(Playfair)이 늦게 오면 제목 높이가 바뀐다 — 도착하면 한 번 더.
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
    };
  }, [measure]);

  return { mode, layout };
}
