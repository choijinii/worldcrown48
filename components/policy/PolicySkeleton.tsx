/**
 * PolicySkeleton — placeholder shown while the policy MD file loads.
 *
 * The matching shimmer animation is in globals.css `.skel`.
 * Reduced-motion: animation neutralized via the @media block at the
 * bottom of the light-theme section.
 */

export function PolicySkeleton(): JSX.Element {
  return (
    <div className="policy-skel" aria-busy="true" aria-live="polite">
      <div className="skel h1" />
      <div className="skel line m" />
      <div className="skel line s" />
      <div className="skel line m" />
      <div className="skel h2" />
      <div className="skel line m" />
      <div className="skel line s" />
      <div className="skel line m" />
      <div className="skel line x" />
      <div className="skel h2" />
      <div className="skel line m" />
      <div className="skel line s" />
      <div className="skel line m" />
    </div>
  );
}
