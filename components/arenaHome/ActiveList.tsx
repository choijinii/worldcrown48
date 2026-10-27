"use client";

/**
 * ActiveList — 진행 중 대회 목록 (ARENA-2 PR 1 · 원장 D-71 · 킥 §2-3 · 정본 D-1 · M-1).
 *
 * 한 줄 = VS 그림 · 카테고리 · 제목 · 설명 · 마감 · **입장하기**(→ 매치 무대). 줄의 나머지 자리를
 * 누르면 그 대회가 전광판에 오른다(`?t=` · 맨 위로). 키보드는 제목 버튼이 같은 일을 한다.
 * 진행 중 = 마감 전 · `status == active` · `isPublicTournament`(서버가 이미 거름).
 * 처음 4줄, "더 보기"(점 세 개)로 4줄씩 늘어난다.
 */
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { categoryChip } from "@/lib/records/chartList";
import { formatDeadline, type ArenaTournament } from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";
import styles from "./arenaHome.module.css";

function Row({
  tournament,
  chip,
  onBoard,
  onShowOnBoard,
}: {
  tournament: ArenaTournament;
  chip: string | null;
  onBoard: boolean;
  onShowOnBoard: (id: string) => void;
}): JSX.Element {
  const { t, lang } = useT();
  const cover = useCoverPair(tournament.id, tournament.thumbnailPair);
  const title = localizedTitle(tournament, lang);
  const desc = tournament.description?.[lang]?.trim() || tournament.description?.ko?.trim() || "";
  const deadline = formatDeadline(tournament.deadlineMs, lang);
  const show = () => onShowOnBoard(tournament.id);
  return (
    <li
      className={styles.row}
      data-testid="arena-active-row"
      data-tid={tournament.id}
      data-on-board={onBoard}
      onClick={show}
    >
      <VSThumb a={cover.a} b={cover.b} onBroken={cover.onBroken} testId={`arena-active-cover-${tournament.id}`} />
      <div className={styles.rowBody}>
        {chip && <span className={styles.cat}>{chip}</span>}
        <button
          type="button"
          className={styles.rowTitle}
          onClick={(e) => {
            e.stopPropagation();
            show();
          }}
          data-testid="arena-active-title"
        >
          {title}
        </button>
        {desc && <p className={styles.rowDesc}>{desc}</p>}
        <div className={styles.rowFoot}>
          <Link
            href={`/arena/${encodeURIComponent(tournament.id)}`}
            className={`${styles.btn} ${styles.rowEnter}`}
            onClick={(e) => e.stopPropagation()}
            data-testid="arena-active-enter"
          >
            {t("arenaHome.enter")}
          </Link>
          {deadline && <span className={styles.mono}>{t("arenaHome.deadline", { date: deadline })}</span>}
        </div>
      </div>
    </li>
  );
}

export function ActiveList({
  tournaments,
  shown,
  onMore,
  boardId,
  categories,
  categorySelected,
  failed,
  onShowOnBoard,
}: {
  tournaments: ArenaTournament[];
  shown: number;
  onMore: () => void;
  boardId: string | null;
  categories: CategoryDoc[];
  categorySelected: string | null;
  failed: boolean;
  onShowOnBoard: (id: string) => void;
}): JSX.Element {
  const { t } = useT();
  const selectedName = categorySelected ? categoryChip(categorySelected, categories) : t("arenaHome.tabs.all");
  return (
    <section className={styles.box} data-testid="arena-active">
      <div className={styles.boxHead}>
        <h2 className={styles.h2}>{t("arenaHome.active.title")}</h2>
        <span className={styles.mono}>{selectedName}</span>
      </div>
      {/* 읽기 실패면 "없어요"라고 말하지 않는다 — 머리만. */}
      {!failed && tournaments.length === 0 && (
        <p className={styles.empty} data-testid="arena-active-empty">
          {t("arenaHome.active.empty")}
        </p>
      )}
      {tournaments.length > 0 && (
        <ul className={styles.activeList}>
          {tournaments.slice(0, shown).map((x) => (
            <Row
              key={x.id}
              tournament={x}
              chip={categoryChip(x.category, categories)}
              onBoard={x.id === boardId}
              onShowOnBoard={onShowOnBoard}
            />
          ))}
        </ul>
      )}
      {tournaments.length > shown && (
        <button type="button" className={styles.more} onClick={onMore} aria-label={t("arenaHome.active.more")} data-testid="arena-active-more">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </button>
      )}
    </section>
  );
}
