/**
 * useStageViewport — 무대 배치(데스크톱 · 모바일 세로 · 모바일 가로)와 칸 크기 (ARENA-1 PR 1).
 *
 * 규칙은 전부 lib/arena/stageLayout(순수·유닛 테스트)이고, 이 훅은 화면 크기와 무대 윗변
 * 위치를 재서 넘기기만 한다.
 *
 *   · 회전 감지 = matchMedia("(orientation: landscape)") + 폭 1024 기준 (D-17 "자동 전환").
 *   · 높이는 **지금 눈에 보이는 높이**(visualViewport)를 쓴다 — 주소창이 접히고 펴질 때,
 *     전체화면에 들어가고 나올 때마다 다시 잰다 (PR 2a · pickViewportHeight).
 *   · **배치만 바꾼다.** 진행 중인 판·선택 기록·match_session_id 는 이 훅 밖(voteStore ·
 *     page.tsx)에 있고, 무대 컴포넌트 트리는 회전해도 같은 트리라 리마운트되지 않는다 (D-17 ①).
 *   · 모바일 가로에서 상단 메뉴를 빼는 일은 SplitStage 가 한다(mode 를 읽어서).
 */
"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import {
  computeFinalLayout,
  computeStageLayout,
  pickViewportHeight,
  stageMode,
  type StageLayout,
  type StageMode,
} from "@/lib/arena/stageLayout";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** 지금 무대가 쓸 수 있는 크기 — 높이는 주소창이 가린 만큼을 뺀 값. */
function readViewport(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: pickViewportHeight(window.innerHeight, window.visualViewport?.height),
  };
}

function readMode(): StageMode {
  if (typeof window === "undefined") return "desktop";
  const { width, height } = readViewport();
  return stageMode(width, height);
}

export function useStageViewport(
  frameRef: RefObject<HTMLElement>,
  onOrient?: () => void,
  /** 칸 수 — 매치 2(기본) · 결승 3(D-06). 3이면 같은 프레임을 셋으로 나눈다. */
  options?: { cells?: 2 | 3 },
): { mode: StageMode; layout: StageLayout | null } {
  // 서버 HTML 과 첫 클라이언트 렌더는 같아야 한다(hydration) — 둘 다 desktop 으로 시작하고,
  // 그리기 전(layout effect)에 실제 배치로 바꾼다. 폰에서 데스크톱 배치가 번쩍이지 않는다.
  const [mode, setMode] = useState<StageMode>("desktop");
  const [layout, setLayout] = useState<StageLayout | null>(null);
  const cells = options?.cells ?? 2;

  const measure = useCallback(() => {
    const el = frameRef.current;
    if (!el || typeof window === "undefined") return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const { width, height } = readViewport();
    const compute = cells === 3 ? computeFinalLayout : computeStageLayout;
    setLayout(compute({ width, height, top }));
  }, [frameRef, cells]);

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
    // 주소창이 접히고 펴지는 것 · 전체화면 진입·해제는 resize 로 안 오는 기기가 있다.
    window.visualViewport?.addEventListener("resize", onChange);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      landscape.removeEventListener("change", onChange);
      wide.removeEventListener("change", onChange);
      window.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
      document.removeEventListener("fullscreenchange", onChange);
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
