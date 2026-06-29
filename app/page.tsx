import PitchPage from "@/components/pitch/PitchPage";

/**
 * `/` — A-1 The Pitch (Domain 1), the trending tournament feed.
 *
 * Route swap (handoff §3, Phase A): this route used to render A-0 Launch Pad,
 * which now lives at `/launch`. The composition lives in <PitchPage> so this
 * file stays a thin route entry.
 */
export default function Home() {
  return <PitchPage />;
}
