"use client";

/**
 * Scoreboard — 아레나 홈 맨 위 전광판 = 대기실 (원장 D-71 · 정본 REF ③ · 킥 §2-1).
 *
 * 왼쪽 = 고른 대회의 VS 그림(VSThumb · 대표 매치 D-35) + 카테고리 · 설명 · 제목 · 마감 +
 * **입장하기**(→ 매치 무대 `/arena/{id}`, 주소 그대로). 오른쪽 = 그 대회의 엔트리(번호순 ·
 * localizedName). 휴대폰은 엔트리 6줄(12명)만 보이고 "더 보기"로 펼친다(D-71 · CSS).
 * 숫자는 엔트리 수만 — 참여 수 · 선택 수 · 라운드 이름은 없다(킥 §4).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { localizedName } from "@/lib/contestantName";
import { localizedTitle } from "@/lib/tournamentTitle";
import { categoryChip } from "@/lib/records/chartList";
import { formatDeadline, type ArenaTournament } from "@/lib/arenaHome/arenaHome";
import type { CategoryDoc } from "@/lib/taxonomy/category";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";
import { useEntries } from "./useEntries";
import styles from "./arenaHome.module.css";

function localizedDescription(t: ArenaTournament, lang: "ko" | "en" | "es"): string {
  const d = t.description;
  const v = d?.[lang]?.trim() || d?.ko?.trim() || "";
  return v;
}

function BoardHero({ tournament, chip }: { tournament: ArenaTournament; chip: string | null }): JSX.Element {
  const { t, lang } = useT();
  const cover = useCoverPair(tournament.id, tournament.thumbnailPair);
  const title = localizedTitle(tournament, lang);
  const desc = localizedDescription(tournament, lang);
  const deadline = formatDeadline(tournament.deadlineMs, lang);
  return (
    <div>
      <div className={styles.hero}>
        <VSThumb a={cover.a} b={cover.b} onBroken={cover.onBroken} testId="arena-board-cover" />
        <div className={styles.heroShade}>
          {chip && <span className={styles.heroCat}>{chip}</span>}
          {desc && <span className={styles.heroDesc}>{desc}</span>}
          <h2 className={styles.heroTitle} data-testid="arena-board-title">
            {title}
          </h2>
          {deadline && <span className={styles.heroDeadline}>{t("arenaHome.deadline", { date: deadline })}</span>}
        </div>
        <Link
          href={`/arena/${encodeURIComponent(tournament.id)}`}
          className={`${styles.btn} ${styles.heroEnter}`}
          data-testid="arena-board-enter"
        >
          {t("arenaHome.enter")}
        </Link>
      </div>
      <div className={styles.heroMeta}>
        <p className={styles.heroMetaTitle}>{title}</p>
        {chip && <span className={styles.cat}>{chip}</span>}
        {deadline && <span className={styles.mono}>{t("arenaHome.deadline", { date: deadline })}</span>}
      </div>
    </div>
  );
}

function Entries({ tournamentId }: { tournamentId: string }): JSX.Element {
  const { t, lang } = useT();
  const { entries } = useEntries(tournamentId);
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => setCollapsed(true), [tournamentId]);
  return (
    <aside className={styles.entries} data-collapsed={collapsed} data-testid="arena-board-entries">
      <div className={styles.entriesHead}>
        <span className={styles.h3}>{t("arenaHome.entries")}</span>
        {entries.length > 0 && <span className={styles.mono}>{entries.length}</span>}
      </div>
      <div className={styles.entriesScroll}>
        <ol className={styles.entriesList}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entry} data-testid="arena-board-entry">
              <span className={styles.entryNo}>{String(e.order).padStart(2, "0")}</span>
              <span className={styles.entryName}>{localizedName(e, lang)}</span>
            </li>
          ))}
        </ol>
      </div>
      {entries.length > 12 && (
        <button
          type="button"
          className={styles.entriesMore}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          data-testid="arena-board-entries-more"
        >
          {t(collapsed ? "arenaHome.entries.more" : "arenaHome.entries.less")}
        </button>
      )}
    </aside>
  );
}

export function Scoreboard({
  tournament,
  categories,
}: {
  tournament: ArenaTournament | null;
  categories: CategoryDoc[];
}): JSX.Element {
  const { t } = useT();
  if (!tournament) {
    return (
      <section data-testid="arena-board" data-board-id="">
        <div className={styles.heroEmpty}>{t("arenaHome.board.empty")}</div>
      </section>
    );
  }
  const chip = categoryChip(tournament.category, categories);
  return (
    <section className={styles.two} data-testid="arena-board" data-board-id={tournament.id}>
      <BoardHero tournament={tournament} chip={chip} />
      <Entries tournamentId={tournament.id} />
    </section>
  );
}
