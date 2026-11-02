"use client";

/**
 * RecommendGrid — ⑤ 추천 대회 (ARENA-2 PR 2 · 원장 D-70 · 킥 §2-5 · 정본 D-1 · M-1).
 *
 * 제목은 "추천 대회" — "AI 추천"·"PICKED FOR YOU" 는 쓰지 않는다(D-70). 규칙 = arenaPicks.recommendTournaments
 * (전광판 대회 제외 · 같은 카테고리 먼저 · 최신 발행순). 3열(휴대폰 2열), 6개씩(휴대폰 4개) "더 보기".
 * 카드 = VS 그림 · 카테고리 · 제목 · 입장하기(→ 매치 무대). 카드의 나머지 자리를 누르면 진행 중 목록과
 * 같이 그 대회가 전광판에 오른다(D-71). 0개면 부모가 구역을 그리지 않는다.
 */
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { categoryChip } from "@/lib/records/chartList";
import type { ArenaTournament } from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";
import styles from "./arenaHome.module.css";

function Card({
  tournament,
  chip,
  onShowOnBoard,
}: {
  tournament: ArenaTournament;
  chip: string | null;
  onShowOnBoard: (id: string) => void;
}): JSX.Element {
  const { t, lang } = useT();
  const cover = useCoverPair(tournament.id, tournament.thumbnailPair);
  const show = () => onShowOnBoard(tournament.id);
  return (
    <li className={styles.recCard} data-testid="arena-rec-card" data-tid={tournament.id} onClick={show}>
      <VSThumb a={cover.a} b={cover.b} onBroken={cover.onBroken} testId={`arena-rec-cover-${tournament.id}`} />
      <div className={styles.recBody}>
        {chip && <span className={styles.cat}>{chip}</span>}
        <button
          type="button"
          className={styles.recTitle}
          onClick={(e) => {
            e.stopPropagation();
            show();
          }}
          data-testid="arena-rec-title"
        >
          {localizedTitle(tournament, lang)}
        </button>
        <Link
          href={`/arena/${encodeURIComponent(tournament.id)}`}
          className={`${styles.btn} ${styles.recEnter}`}
          onClick={(e) => e.stopPropagation()}
          data-testid="arena-rec-enter"
        >
          {t("arenaHome.enter")}
        </Link>
      </div>
    </li>
  );
}

export function RecommendGrid({
  tournaments,
  shown,
  onMore,
  categories,
  onShowOnBoard,
}: {
  tournaments: ArenaTournament[];
  shown: number;
  onMore: () => void;
  categories: CategoryDoc[];
  onShowOnBoard: (id: string) => void;
}): JSX.Element {
  const { t } = useT();
  return (
    <section className={styles.box} data-testid="arena-rec">
      <div className={styles.boxHead}>
        <h2 className={styles.h2}>{t("arenaHome.recommend.title")}</h2>
      </div>
      <ul className={styles.recGrid}>
        {tournaments.slice(0, shown).map((x) => (
          <Card key={x.id} tournament={x} chip={categoryChip(x.category, categories)} onShowOnBoard={onShowOnBoard} />
        ))}
      </ul>
      {tournaments.length > shown && (
        <button type="button" className={styles.more} onClick={onMore} aria-label={t("arenaHome.recommend.more")} data-testid="arena-rec-more">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </button>
      )}
    </section>
  );
}
