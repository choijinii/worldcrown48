"use client";

/**
 * CategoryTabs — 카테고리 줄 + 마감 대회 검색 칸 (ARENA-2 PR 1 · 원장 D-63 · 킥 §2-2).
 *
 * 탭 = 전체 + 공개(live) 카테고리(order 순). 탭 글자는 Record Room 칩과 같이 영어 대문자.
 * 탭은 진짜 링크(`/arena?cat=kpop`)라 새 탭으로 열거나 공유할 수 있고, 그냥 누르면 주소만
 * 바꾼다(서버를 다시 부르지 않음). 검색 칸은 **마감 대회 게시판만** 거른다(D-63 · 킥 §2-2).
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
  query,
  onQuery,
}: {
  categories: CategoryDoc[];
  selected: string | null;
  tParam: string | null;
  onChoose: (id: string | null) => void;
  query: string;
  onQuery: (q: string) => void;
}): JSX.Element {
  const { t } = useT();
  const tabs: { id: string | null; label: string }[] = [
    { id: null, label: t("arenaHome.tabs.all") },
    ...categories.map((c) => ({ id: c.id, label: (c.name.en || c.id).toUpperCase() })),
  ];
  return (
    <div className={styles.tabsRow}>
      <nav className={styles.tabs} aria-label={t("arenaHome.tabs.label")} data-testid="arena-tabs">
        {tabs.map((tab) => (
          <a
            key={tab.id ?? "all"}
            href={arenaHomeHref({ t: tParam, cat: tab.id })}
            className={styles.tab}
            aria-current={tab.id === selected ? "true" : undefined}
            data-testid={`arena-tab-${tab.id ? tab.id.toLowerCase() : "all"}`}
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
    </div>
  );
}
