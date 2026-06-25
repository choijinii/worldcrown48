/**
 * RankList — wireframe `.rank-list` rows (rank · photo · name · rate). The ONLY
 * Vote Rate (%) surface (CLAUDE.md 원칙 #8). Renders `entry.rate` via the pure
 * formatter ONLY — it NEVER reads `entry.voteCount` (Vote Count 금지, trap #7;
 * E2E guards this). Bar width is normalized to the leader (wireframe JS line 992).
 */
import { avatarGlyph, barWidth, formatRate } from "@/lib/ranking/rateFormatter";
import type { RankingEntry } from "@/lib/ranking/rankingTypes";

export function RankList({
  entries,
  flagFirst,
}: {
  entries: RankingEntry[];
  flagFirst: boolean;
}): JSX.Element {
  const topRate = entries[0]?.rate ?? 0;
  return (
    <div className="rank-list" data-testid="rank-list">
      {entries.map((entry, i) => {
        const cls =
          "rank-row" +
          (i === 0 ? " top" : "") +
          (i === 0 && flagFirst ? " flag" : "");
        return (
          <div key={entry.contestantId} className={cls} data-testid="rank-row">
            <div className="rank-no">{entry.rank}</div>
            <div className="rank-av">
              {entry.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.imageUrl} alt="" />
              ) : (
                <span>{avatarGlyph(entry.name)}</span>
              )}
            </div>
            <div className="rank-info">
              <div className="rn">{entry.name}</div>
            </div>
            <div className="rank-rate">
              <div className="rv" data-testid="rank-rate">
                {formatRate(entry.rate)}
              </div>
              <div className="rbar">
                <i style={{ width: `${barWidth(entry.rate, topRate)}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
