/**
 * RankEmpty — wireframe `.rank-empty` (crown outline + "No ranking yet").
 * Shown when no votes have landed yet (ranking_cache absent or rankings empty).
 */
export function RankEmpty({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): JSX.Element {
  return (
    <div className="rank-empty" data-testid="rank-empty">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wc48-crown-circle-outline.svg" alt="" />
      <div className="et">{title}</div>
      <div className="es">{subtitle}</div>
    </div>
  );
}
