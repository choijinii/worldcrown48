/**
 * RankSkeleton — wireframe `.rank-skel` (5 shimmer rows) shown while the
 * ranking_cache snapshot is still loading.
 */
export function RankSkeleton(): JSX.Element {
  return (
    <div className="rank-skel" data-testid="rank-skeleton">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="rskel" />
      ))}
    </div>
  );
}
