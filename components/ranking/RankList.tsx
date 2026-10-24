/**
 * RankList — 차트의 줄 (등수 · 그림 · 이름 · **Crown Score**).
 *
 * 화면에 나가는 수치는 Crown Score 정수 하나뿐이다 (대표 2026-09-24). 세 비율
 * (순위점수율·우승율·점유율)은 캐시에 실려 오지만 **그리지 않는다** — 런칭 후 세부 분석
 * 페이지의 재료다. `voteCount` 는 예나 지금이나 절대 읽지 않는다 (Vote Count 금지,
 * 원칙 #8 · trap #7; E2E가 지킨다). 막대는 1위를 100%로 잡는다.
 */
import {
  avatarGlyph,
  barWidth,
  formatCrownScore,
} from "@/lib/ranking/rateFormatter";
import type { Lang } from "@/lib/cookieConsent";
import { localizedName } from "@/lib/contestantName";
import type { CrownRankingEntry } from "@/lib/ranking/rankingTypes";
import { buildThumbnailUrl } from "@/lib/embed/loopRange";

export function RankList({
  entries,
  flagFirst,
  lang,
}: {
  entries: CrownRankingEntry[];
  flagFirst: boolean;
  /** 엔트리 이름의 화면 언어 — 캐시 행의 nameI18n, 비면 en → 한글 (NAME-I18N-1 · D-61). */
  lang: Lang;
}): JSX.Element {
  // 1위의 점수가 막대의 기준이다. 목록이 Crown Score 순이라 첫 줄이 최고점이다.
  const topScore = entries[0]?.crownScore ?? 0;
  return (
    <div className="rank-list" data-testid="rank-list">
      {entries.map((entry, i) => {
        const cls =
          "rank-row" +
          (i === 0 ? " top" : "") +
          (i === 0 && flagFirst ? " flag" : "");
        const name = localizedName(entry, lang);
        return (
          <div key={entry.contestantId} className={cls} data-testid="rank-row">
            <div className="rank-no">{entry.rank}</div>
            <div className="rank-av">
              {entry.videoId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={buildThumbnailUrl(entry.videoId)} alt="" />
              ) : (
                <span>{avatarGlyph(name)}</span>
              )}
            </div>
            <div className="rank-info">
              <div className="rn">{name}</div>
            </div>
            <div className="rank-rate">
              <div className="rv" data-testid="rank-score">
                {formatCrownScore(entry.crownScore)}
              </div>
              <div className="rbar">
                <i
                  style={{ width: `${barWidth(entry.crownScore, topScore)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
