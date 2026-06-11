import { LaunchHero } from "@/components/launch/LaunchHero";
import { FeaturedTournament } from "@/components/launch/FeaturedTournament";
import { WaitlistForm } from "@/components/launch/WaitlistForm";
import { SNSLinks } from "@/components/launch/SNSLinks";

/**
 * A-0 · Launch Pad (Domain 0)
 *
 * Composition: LaunchHero + FeaturedTournament + WaitlistForm + SNSLinks,
 * wrapped in `.lp` shell with film-grain overlay.
 *
 * The `.lp-inner` is the container-query host (container-type: inline-size in
 * globals.css), so children scale by container width, not viewport width.
 */
export default function Home() {
  return (
    <main className="lp">
      <div className="lp-grain" aria-hidden="true" />
      <div className="lp-inner">
        <LaunchHero />
        <FeaturedTournament />
        <WaitlistForm />
        <SNSLinks />
      </div>
    </main>
  );
}
