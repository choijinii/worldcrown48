"use client";

/**
 * ClosedBoard — 마감 대회 게시판 (ARENA-2 PR 1 · 원장 D-37 · D-45 · D-63 · D-68 · 정본 D-1 · D-3 · D-5).
 *
 * 한 줄 = 작은 그림 · 제목 · 카테고리 · 챔피언 이름 · **"랭킹 보기"**(D-68) · 마감 시각. 줄 전체가
 * 그 대회의 차트(`/arena/{id}/ranking`)로 가는 링크다. 10줄/쪽 · 마감 최신순 · 쪽 넘김.
 * 챔피언 = 차트 캐시 1위. 챔피언이 없는(10판 미만) 대회는 여기 오지 않는다(D-72). 마감 대회에는 대기실이 없다.
 */
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { localizedName } from "@/lib/contestantName";
import { localizedTitle } from "@/lib/tournamentTitle";
import { categoryChip, chartHref } from "@/lib/records/chartList";
import { formatClosedAt, pageWindow, type ClosedRow } from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import styles from "./arenaHome.module.css";

export function ClosedBoard({
  board,
  query,
  hasAnyClosed,
  failed,
  categories,
  onPage,
  activeAnchor,
}: {
  board: { rows: ClosedRow[]; total: number; page: number; pageCount: number };
  query: string;
  hasAnyClosed: boolean;
  failed: boolean;
  categories: CategoryDoc[];
  onPage: (page: number) => void;
  activeAnchor: string;
}): JSX.Element {
  const { t, lang } = useT();
  const q = query.trim();
  const sub = q
    ? t("arenaHome.closed.resultNote", { q, n: board.total })
    : board.total > 0
      ? `${t("arenaHome.closed.sort")} · ${board.page} / ${board.pageCount}`
      : "";

  return (
    <section className={styles.box} data-testid="arena-closed">
      <div className={styles.boxHead}>
        <h2 className={styles.h2}>{t("arenaHome.closed.title")}</h2>
        {sub && (
          <span className={styles.mono} data-testid="arena-closed-sub">
            {sub}
          </span>
        )}
      </div>

      {!failed && !hasAnyClosed && (
        <div className={styles.closedEmpty} data-testid="arena-closed-empty">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/wc48-crown-circle-outline.svg" alt="" className={styles.closedEmptyIcon} />
          <span className={styles.closedEmptyTitle}>{t("arenaHome.closed.empty.title")}</span>
          <span className={styles.closedEmptyBody}>{t("arenaHome.closed.empty.body")}</span>
          <a href={`#${activeAnchor}`} className={styles.btn}>
            {t("arenaHome.closed.empty.cta")}
          </a>
        </div>
      )}

      {hasAnyClosed && board.total === 0 && (
        <p className={styles.empty} data-testid="arena-closed-noresult">
          {q ? t("arenaHome.closed.noResult", { q }) : t("arenaHome.closed.empty.title")}
        </p>
      )}

      {board.rows.length > 0 && (
        <>
          <div className={styles.table}>
            <div className={styles.closedHead} aria-hidden="true">
              <span>{t("arenaHome.closed.col.tournament")}</span>
              <span>{t("arenaHome.closed.col.champion")}</span>
              <span />
              <span>{t("arenaHome.closed.col.closed")}</span>
            </div>
            <ol className={styles.closedList}>
              {board.rows.map(({ t: x, champion }) => (
                <li key={x.id}>
                  <Link href={chartHref(x.id)} className={styles.closedRow} data-testid="arena-closed-row" data-tid={x.id}>
                    <span className={styles.closedTitleCell}>
                      <span className={styles.closedThumb} aria-hidden="true">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/brand/wc48-crown-filled.svg" alt="" width={16} height={16} />
                        <span className={styles.closedThumbLabel}>CHAMPION</span>
                      </span>
                      <span className={styles.closedText}>
                        <span className={styles.closedTitle} data-testid="arena-closed-title">
                          {localizedTitle(x, lang)}
                        </span>
                        <span className={styles.cat}>{categoryChip(x.category, categories) ?? ""}</span>
                      </span>
                    </span>
                    <span className={styles.champ}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/wc48-crown-filled.svg" alt="" width={14} height={14} />
                      <span className={styles.champName} data-testid="arena-closed-champion">
                        {localizedName(champion, lang)}
                      </span>
                    </span>
                    <span className={styles.rankBtn}>{t("arenaHome.closed.viewRanking")}</span>
                    <span className={styles.closedAt}>{formatClosedAt(x.deadlineMs)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
          {board.pageCount > 1 && (
            <nav className={styles.pager} data-testid="arena-closed-pager">
              <button
                type="button"
                className={styles.pageBtn}
                disabled={board.page <= 1}
                aria-label={t("arenaHome.page.prev")}
                onClick={() => onPage(board.page - 1)}
              >
                ‹
              </button>
              {pageWindow(board.page, board.pageCount).map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.pageBtn}
                  aria-current={n === board.page ? "page" : undefined}
                  aria-label={t("arenaHome.page.n", { n })}
                  onClick={() => onPage(n)}
                  data-testid={`arena-closed-page-${n}`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className={styles.pageBtn}
                disabled={board.page >= board.pageCount}
                aria-label={t("arenaHome.page.next")}
                onClick={() => onPage(board.page + 1)}
                data-testid="arena-closed-next"
              >
                ›
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
