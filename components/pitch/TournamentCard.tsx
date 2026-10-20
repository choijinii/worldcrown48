"use client";

/**
 * M3 · TournamentCard — cover (대표 매치 VS 장면) + featured/status pills + meta
 * + 참가하기. Links to the Arena (/arena/{id}).
 *
 * THUMB-1 PR 2 (원장 D-35 · 합격 시안 `docs/design/claude-design/THUMB-1_2026-10-18/`
 * A-1~A-3): 커버 = 공용 `VSThumb`(16:9 · 제목은 커버 하단 딤 위 · 2줄 말줄임) · 몸통 = 메타 +
 * 참가하기 버튼만. 커버 두 칸은 `useCoverPair` 가 대표 매치를 읽어 정하고, 그림이 깨지면(㉣)
 * 앞 번호 엔트리로 바꾼다. 커버는 테마와 무관하게 매치 무대 색(다크)이다.
 *
 * Hard constraints (handoff §5 / AC-4 / AC-6): NO Vote Count, NO Vote Rate(%),
 * NO LIVE badge, NO Round info anywhere on the card. The meta line is built
 * inline from `pitch.card.contestants` + `pitch.card.closes` (formatCloses
 * supplies the date) — "48 Contestants · Closes {date}" only. The status pill
 * text is the tournament's own status; on The Pitch the feed is active-only,
 * so this renders the gold ACTIVE pill.
 */

import Link from "next/link";
import type { Tournament } from "@/lib/types/tournament";
import { formatCloses, statusPillVariant } from "@/lib/pitch/trending";
import { track } from "@/lib/analytics";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { VSThumb } from "@/components/thumbnail/VSThumb";
import { useCoverPair } from "@/components/thumbnail/useCoverPair";

export interface TournamentCardProps {
  tournament: Tournament;
  position: number;
}

export function TournamentCard({ tournament, position }: TournamentCardProps) {
  const { t, lang } = useT();
  const closes = formatCloses(tournament.tournamentDeadline);
  const pill = statusPillVariant(tournament.status);
  const displayTitle = localizedTitle(tournament, lang);
  const cover = useCoverPair(tournament.id, tournament.thumbnailPair);

  return (
    <Link
      className="tcard"
      href={`/arena/${tournament.id}`}
      aria-label={displayTitle}
      onClick={() =>
        track("a1_card_click", { tournamentId: tournament.id, position })
      }
    >
      <div className="tcard-cover" data-cover-a={cover.aId ?? ""} data-cover-b={cover.bId ?? ""}>
        <VSThumb
          a={cover.a}
          b={cover.b}
          title={displayTitle}
          titleSize="var(--tcard-title-size)"
          onBroken={cover.onBroken}
          testId={`tcard-cover-${tournament.id}`}
        />
        <div className="tcard-chips">
          {tournament.featured ? (
            <span className="featured-pill" aria-label="Featured tournament">
              {t("pitch.card.featured")}
            </span>
          ) : (
            <span className="tcard-spacer" />
          )}
          <span className={`status-pill status-${pill}`}>
            <span className="led" aria-hidden="true" />
            {tournament.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="tcard-body">
        <div className="tcard-meta">
          <span>{t("pitch.card.contestants")}</span>
          {closes && (
            <span>
              <span className="sep">·&nbsp;</span>
              {t("pitch.card.closes", { date: closes })}
            </span>
          )}
        </div>
        <div className="tcard-foot">
          <span className="tcard-enter">
            {t("pitch.card.cta")}
          </span>
        </div>
      </div>
    </Link>
  );
}
