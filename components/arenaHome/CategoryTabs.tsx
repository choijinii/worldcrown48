"use client";

/**
 * CategoryTabs — 카테고리 줄 + 마감 대회 검색 칸 (ARENA-2 PR 1 · 원장 D-63 · 킥 §2-2).
 *
 * 탭 = 전체 + 공개(live) 카테고리(order 순). 탭 글자는 Record Room 칩과 같이 영어 대문자.
 * 탭은 진짜 링크(`/arena?cat=kpop`)라 새 탭으로 열거나 공유할 수 있고, 그냥 누르면 주소만
 * 바꾼다(서버를 다시 부르지 않음). 검색 칸은 **마감 대회 게시판만** 거른다(D-63 · 킥 §2-2).
 *
 * PITCH-2 — 홈(Trending · NEWS ROOM · CHARTS)도 이 부품을 쓴다: `hrefFor` 로 홈 주소를, `testIdPrefix` 로
 * 구역마다 다른 시험 이름을 넘기고, `onQuery` 를 주지 않으면 검색 칸이 없다. 아레나 홈 동작은 그대로.
 */
import type { MouseEvent } from "react";
import { useT } from "@/lib/i18n/useT";
import { arenaHomeHref } from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import styles from "./arenaHome.module.css";

function plainClick(e: MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function CategoryTabs({
  categories,
  selected,
  tParam,
  onChoose,
  query = "",
  onQuery,
  hrefFor,
  testIdPrefix = "arena-tab",
  navTestId = "arena-tabs",
  pill = false,
}: {
  categories: CategoryDoc[];
  selected: string | null;
  tParam?: string | null;
  onChoose: (id: string | null) => void;
  query?: string;
  /** 없으면 검색 칸을 그리지 않는다(홈). */
  onQuery?: (q: string) => void;
  /** 탭 링크 주소 — 없으면 아레나 홈 주소. */
  hrefFor?: (id: string | null) => string;
  testIdPrefix?: string;
  navTestId?: string;
  /** 홈(PITCH-2 시안 P-1) — 둥근 알약 · 고른 탭 진한 남색. 모양은 pitch.css `.home-tabs`. 아레나 홈은 그대로. */
  pill?: boolean;
}): JSX.Element {
  const { t } = useT();
  const tabs: { id: string | null; label: string }[] = [
    { id: null, label: t("arenaHome.tabs.all") },
    ...categories.map((c) => ({ id: c.id, label: (c.name.en || c.id).toUpperCase() })),
  ];
  return (
    <div className={styles.tabsRow}>
      <nav className={pill ? `${styles.tabs} home-tabs` : styles.tabs} aria-label={t("arenaHome.tabs.label")} data-testid={navTestId}>
        {tabs.map((tab) => (
          <a
            key={tab.id ?? "all"}
            href={hrefFor ? hrefFor(tab.id) : arenaHomeHref({ t: tParam ?? null, cat: tab.id })}
            className={styles.tab}
            aria-current={tab.id === selected ? "true" : undefined}
            data-testid={`${testIdPrefix}-${tab.id ? tab.id.toLowerCase() : "all"}`}
            onClick={(e) => {
              if (!plainClick(e)) return;
              e.preventDefault();
              onChoose(tab.id);
            }}
          >
            {tab.label}
          </a>
        ))}
      </nav>
      {onQuery && (
      <label className={styles.search}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className={styles.srOnly}>{t("arenaHome.search.placeholder")}</span>
        <input
          type="search"
          className={styles.searchInput}
          placeholder={t("arenaHome.search.placeholder")}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          data-testid="arena-search"
        />
        {query && (
          <button type="button" className={styles.searchClear} onClick={() => onQuery("")} data-testid="arena-search-clear">
            {t("arenaHome.search.clear")}
          </button>
        )}
      </label>
      )}
    </div>
  );
}
