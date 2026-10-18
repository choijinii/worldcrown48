import { LaunchHero } from "@/components/launch/LaunchHero";
import { LaunchIllustration } from "@/components/launch/LaunchIllustration";
import { LaunchBanner } from "@/components/launch/LaunchBanner";
import { FeaturedTournament } from "@/components/launch/FeaturedTournament";
import { WaitlistForm } from "@/components/launch/WaitlistForm";
import { SNSLinks } from "@/components/launch/SNSLinks";

/**
 * A-0 · Launch Pad (Domain 0) — archived route.
 *
 * Moved verbatim from `app/page.tsx` during the A-1 route swap (handoff §3,
 * Phase A). `/` now serves A-1 The Pitch; this Launch Pad lives at `/launch`
 * so the pre-launch waitlist surface stays reachable without deletion
 * (handoff §5 DON'T: never delete A-0, always archive).
 *
 * Composition: LaunchHero + LaunchIllustration + FeaturedTournament + WaitlistForm
 * + SNSLinks, wrapped in `.lp` shell with film-grain overlay. 맨 아래 배너 자리
 * `launch-below`(970 폭)는 .lp-inner(800) 밖에 둔다. 그림 자리 = 원장 D-54 · 배너 = D-21 적용
 * (PRE-REG-1).
 *
 * The `.lp-inner` is the container-query host (container-type: inline-size in
 * globals.css), so children scale by container width, not viewport width.
 */
export default function LaunchPad() {
  return (
    <main className="lp">
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-inner">
        <LaunchHero />
        <LaunchIllustration />
        <FeaturedTournament />
        <WaitlistForm />
        <SNSLinks />
      </div>
      <LaunchBanner />
    </main>
  );
}
