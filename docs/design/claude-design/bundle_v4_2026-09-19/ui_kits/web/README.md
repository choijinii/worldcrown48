# WorldCrown48 web UI kit

Clickable React + Babel reference for the v2.3 WC48 web product, across four screens.

## Files

| File | Role |
| --- | --- |
| `index.html` | entry point — loads React 18 + Babel + the JSX modules |
| `kit.css` | imports `colors_and_type.css`, defines layout + component styles |
| `data.jsx` | mock Tournaments + Contestants (no banned patterns) |
| `components.jsx` | Floating Island Nav · MagneticButton · StatusPill · ArticleAIByline · Footer |
| `LaunchPad.jsx` | **Domain 0** — pre-launch landing + email waitlist + Manifesto |
| `Pitch.jsx` | **Domain 1** — Tournament-of-the-Week hero + active/published grid |
| `Arena.jsx` | **Domain 3** — VS Battle voting (the centerpiece) |
| `CrownReveal.jsx` | Crown Card share artifact (1080×1350, 4:5 Instagram feed, framed in Crown Gold) |
| `App.jsx` | tab router |

## v2.3 compliance checklist

* ✅ Floating Island GNB (Twilight Indigo, rectangular, brand left, Fan CTA right)
* ✅ Magnetic buttons (~0.06× pointer-tracking)
* ✅ TournamentCard has NO `LIVE` badge, NO Round progress, NO AI-Report — only category · title · {N} Contestants · Tournament Deadline
* ✅ Arena VS Battle — no Round/Match counter, no daily vote quota (retired concepts)
* ✅ NO Vote Rate (%) during the Match — bandwagon bias avoided
* ✅ NO `ENDS IN` timer anywhere — Match/Round have no deadline
* ✅ Status pills use the five-value contract: `draft / published / active / closed / completed`
* ✅ `✦ AI-Report` appears only on the footer of news articles — never on cards, banners, or boxes
* ✅ Crown Card uses Playfair italic for the Champion name + JetBrains mono for the bracket trail
* ✅ Noise overlay on the body (mix-blend overlay, 5% opacity)
* ✅ Three radii (0, 5px, 999px) — nothing in between

## What's intentionally cosmetic

* Vote outcomes are state-only; no backend.
* "Submitting…" / "Vote Recorded" states are not animated through (they exist on the buttons preview card).
* Newsroom + Locker Room + Lab + Admin Dashboard are out of scope for the four-screen kit — see the Components preview cards for the Admin Dashboard light-theme reference.
* Korean translation is a starting point; native-speaker review needed before launch.

## Caveats

* No real photography. Contestant portraits are synthetic gradient + monogram. Real photos are user-supplied at Tournament creation time.
* Lucide is a placeholder for the functional icon set (search · chevron · etc.). Swap when an internal icon library is supplied.
