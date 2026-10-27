"use client";

/**
 * ArenaHome — `/arena` 아레나 홈 (ARENA-2 PR 1 · 원장 D-37 · D-63 · D-67~D-71 · 킥 §2).
 *
 * 위에서부터 ① 전광판(= 대기실) + 엔트리 ② 카테고리 줄 + 검색 ③ 진행 중 목록 + 카테고리 뉴스
 * ④ 가로 띠(배너 + 300×90) ⑥ 마감 대회 게시판 + 마감 대회 뉴스. ⑤ 추천 대회는 PR 2.
 *
 * 주소가 상태다: `?t=` = 전광판 대회 · `?cat=` = 카테고리(공유·새로고침 유지). 바꿀 때는
 * `history.pushState / replaceState` 만 쓴다 — Next 14.2 가 `useSearchParams` 에 반영하고,
 * 서버가 다시 읽지 않는다(데이터는 첫 요청에 서버가 한 번 읽었다). 검색어·쪽은 화면 상태.
 *
 * 데이터 = 서버(app/arena/page.tsx · lib/arenaHome/arenaHomeData). 규칙 = lib/arenaHome/arenaHome.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import {
  ACTIVE_PAGE_SIZE,
  arenaHomeHref,
  categoryFromParam,
  closedBoard,
  filterByCategory,
  pickBoardTournament,
} from "@/lib/arenaHome/arenaHome";
import type { ArenaHomeData } from "@/lib/arenaHome/arenaHomeData";
import { usePageBannerVariant } from "@/components/layout/useBannerVariant";
import { BannerSlot } from "@/components/layout/BannerSlot";
import { Scoreboard } from "./Scoreboard";
import { ActiveList } from "./ActiveList";
import { ClosedBoard } from "./ClosedBoard";
import { SideNews } from "./SideNews";
import { CategoryTabs } from "./CategoryTabs";
import styles from "./arenaHome.module.css";

const ACTIVE_ANCHOR = "arena-active";

/** 휴대폰(정본 M-1 · 599 이하)이면 가로 띠 배너가 전광판 바로 아래로 올라간다. 첫 렌더는 데스크톱. */
function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 599px)");
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return phone;
}

function scrollToTop(): void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

export function ArenaHome({ data }: { data: ArenaHomeData }): JSX.Element {
  const { t } = useT();
  const params = useSearchParams();
  const bannerVariant = usePageBannerVariant();
  const phone = useIsPhone();

  const tParam = params.get("t");
  const categoryIds = useMemo(() => data.categories.map((c) => c.id), [data.categories]);
  const category = categoryFromParam(params.get("cat"), categoryIds);
  const board = pickBoardTournament(data.active, tParam);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [activeShown, setActiveShown] = useState(ACTIVE_PAGE_SIZE);

  // 탭이 바뀌면 목록·게시판은 처음부터.
  useEffect(() => {
    setPage(1);
    setActiveShown(ACTIVE_PAGE_SIZE);
  }, [category]);

  const active = filterByCategory(data.active, category);
  const closed = closedBoard(data.closed, { category, query, page });

  /** 줄을 누르면 그 대회가 전광판에 오른다(D-71) — 뒤로 가기로 돌아올 수 있게 push. */
  const showOnBoard = useCallback(
    (id: string) => {
      window.history.pushState(null, "", arenaHomeHref({ t: id, cat: category }));
      scrollToTop();
    },
    [category],
  );

  const chooseCategory = useCallback(
    (id: string | null) => {
      window.history.replaceState(null, "", arenaHomeHref({ t: tParam, cat: id }));
    },
    [tParam],
  );

  const banner = bannerVariant && (
    <BannerSlot slot="arena-between" variant={bannerVariant} className={styles.slot} />
  );

  return (
    <main className={styles.page} data-theme="light" data-testid="arena-home">
      <div className={styles.inner}>
        <h1 className={styles.srOnly}>{t("arenaHome.h1")}</h1>

        <Scoreboard tournament={board} categories={data.categories} />
        {phone && banner && <div className={styles.bandSolo}>{banner}</div>}

        <CategoryTabs
          categories={data.categories}
          selected={category}
          tParam={tParam}
          onChoose={chooseCategory}
          query={query}
          onQuery={(q) => {
            setQuery(q);
            setPage(1);
          }}
        />

        <div className={styles.two} id={ACTIVE_ANCHOR}>
          <ActiveList
            tournaments={active}
            shown={activeShown}
            onMore={() => setActiveShown((n) => n + ACTIVE_PAGE_SIZE)}
            boardId={board?.id ?? null}
            categories={data.categories}
            categorySelected={category}
            failed={data.failed}
            onShowOnBoard={showOnBoard}
          />
          <SideNews titleKey="arenaHome.news.category" slot="arena-side-active" testId="arena-news-category" />
        </div>

        {!phone && banner && (
          <div className={bannerVariant === "desktop" ? styles.band : styles.bandSolo} data-testid="arena-band">
            {banner}
            {bannerVariant === "desktop" && (
              <BannerSlot slot="arena-beside" variant="strip" className={styles.slot} />
            )}
          </div>
        )}

        <div className={styles.two}>
          <ClosedBoard
            board={closed}
            query={query}
            hasAnyClosed={data.closed.length > 0}
            failed={data.failed}
            categories={data.categories}
            onPage={setPage}
            activeAnchor={ACTIVE_ANCHOR}
          />
          <SideNews titleKey="arenaHome.news.closed" slot="arena-side-closed" testId="arena-news-closed" />
        </div>
      </div>
    </main>
  );
}
