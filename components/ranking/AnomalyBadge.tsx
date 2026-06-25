/**
 * AnomalyBadge — wireframe `.anomaly` callout (line 765~769). Shows the primary
 * fired anomaly: title + detail subtitle (e.g. "#1 lead margin 33.3%p over #2 ·
 * sent to System Admin") + the right-aligned tag (T-1..T-4).
 *
 * NOT an AI-Report badge — this is a crimson moderation flag, never the gold
 * "● AI-Report" badge (Footer-Only Lock, CLAUDE.md 원칙 #4).
 */
import type { AnomalyTag } from "@/lib/ranking/rankingTypes";

export function AnomalyBadge({
  title,
  detail,
  tag,
}: {
  title: string;
  detail: string;
  tag: AnomalyTag;
}): JSX.Element {
  return (
    <div className="anomaly" data-testid="anomaly-badge">
      <div className="aico">!</div>
      <div>
        <div className="at">{title}</div>
        <div className="as">{detail}</div>
      </div>
      <span className="atag" data-testid="anomaly-tag">
        {tag}
      </span>
    </div>
  );
}
