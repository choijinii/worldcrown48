# 👑 WorldCrown48 — Google Stitch Design Spec Prompt
# WC48_Stitch_DesignSpec_v1.0.md
# MVP 1 통합 디자인 스펙 | Domain 0~3 다크 테마 기준 | 2026-05-24 작성

> **이 파일의 목적**: Google Stitch에 붙여넣어 WorldCrown48 UI를 생성하는 통합 디자인 스펙 프롬프트.
> 각 섹션은 독립적으로 Stitch에 입력할 수 있으며, 전체를 한 번에 입력해도 됩니다.
> **최신 기준**: WC48_DESIGN_SYSTEM_v2.3.md (Twilight Stadium Edition)

---

## 🧭 HOW TO USE THIS FILE

1. **전체 프롬프트** → 이 파일 전체를 Stitch에 붙여넣기 (종합 UI 생성)
2. **도메인별 프롬프트** → 각 `## SCREEN` 섹션만 복사해서 입력
3. **컴포넌트 프롬프트** → `## COMPONENT` 섹션만 복사해서 입력

---

## ═══════════════════════════════════════
## PART 1 — GLOBAL DESIGN SYSTEM
## (모든 화면에 공통 적용)
## ═══════════════════════════════════════

---

### [GLOBAL PROMPT — 모든 Stitch 입력 앞에 붙이세요]

```
Design a screen for WorldCrown48 (WC48) — a global fan voting tournament platform.
Style: Dark cinematic sporty luxury. Think: FIFA × Spotify × premium sports app.
Target: Global MZ fans (18–35). Language: English + Korean bilingual UI.

IDENTITY:
- WC48 is a fan-choice voting service (NOT a betting or prediction service)
- Fans vote for their favorite Contestant in a bracket-style tournament (48 → 24 → 12 → 6 → FINAL)
- Result: personalized "Crown Card" shareable on social media

MANDATORY DESIGN RULES:
① Background: NEVER use pure black (#000000). Use deep navy-indigo palette.
② Gold (#FCD006) is the ONLY brand accent. No neon yellow, green, or pink.
③ No Korean-style design elements. Global aesthetic only.
④ Badge text: ALWAYS "● AI-Report" (11px, #FCD006). NEVER "AI GENERATED" or "AI".
⑤ No "FIFA", "Official" text anywhere (trademark).
⑥ Never show Vote Count (raw numbers like "1,234 votes"). Only Vote Rate (%) on ranking screens.
⑦ No round timers (ENDS IN hh:mm:ss). Only Tournament Deadline dates are allowed.
⑧ Round names: ROUND OF 48 / ROUND OF 24 / ROUND OF 12 / ROUND OF 6 / THE FINAL.
   NEVER use: "ROUND OF 16", "ROUND OF 32", "QUARTERFINAL", "SEMIFINAL".
⑨ Match progress: "ROUND OF 48 · MATCH 7 / 24" format only.
⑩ THE FINAL shows 3 Contestants simultaneously — user picks 1 directly (NOT split into 2 x 1v1).
```

---

### [DESIGN TOKENS — 다크 테마 (Domain 0, 1, 2, 3)]

> 디자인 토큰 색·폰트 값의 단일 진실은 `docs/design/colors_and_type.css`입니다 (2026-05-25 로고 v3.0 정합). 값을 여기에 중복 기재하지 않습니다.

```
TYPOGRAPHY:
  Display (hero headings): Playfair Display, Georgia — italic bold
  Heading (titles, labels): Pretendard, Inter — weight 600–900
  Mono (badges, stats, codes): JetBrains Mono, monospace — weight 500–600
  Body (descriptions): Pretendard, Inter — weight 400

TYPE SCALE:
  Hero:    clamp(48px, 8vw, 96px)
  H1:      48px / bold
  H2:      32px / semibold
  H3:      24px / semibold
  Body:    16px / regular
  Caption: 14px / regular
  Badge:   10–11px / mono / uppercase / letter-spacing 0.2em

SPACING SYSTEM (8px grid):
  xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px | 3xl: 64px

BORDER RADIUS:
  Button: 9999px (pill)
  Card:   16–20px
  Badge:  6px
  Input:  12px

BOX SHADOWS (dark theme):
  Card:    0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)
  Gold glow: 0 0 32px rgba(252,208,6,0.2), 0 0 64px rgba(252,208,6,0.1)
  Turquoise glow: 0 0 24px rgba(0,163,183,0.3)
  Crimson glow:   0 0 24px rgba(215,6,58,0.3)

NOISE OVERLAY (전 화면 필수):
  Full-screen grain texture layer, opacity: 0.035, pointer-events: none, z-index: top

ANIMATIONS:
  Page entrance: GSAP stagger fade-up (y: 30px → 0, opacity: 0→1, stagger: 0.12s)
  Hover cards:   scale(1.02), gold border ring-2 (#FCD006), transition 200ms
  VS selection:  scale(1.05) + gold ring + Turquoise/Crimson glow on selected side
  Button hover:  Magnetic effect — slight x/y shift following cursor
```

---

## ═══════════════════════════════════════
## PART 2 — COMPONENT LIBRARY
## ═══════════════════════════════════════

---

### [COMPONENT: Floating Island GNB]

```
Design a floating navigation bar (Floating Island GNB) for WorldCrown48:

Layout:
- Horizontally centered, floating pill shape
- Detached from edges: top: 20px, auto left/right margin
- Width: fit-content (not full-width)
- Height: 56px desktop / 48px mobile
- Border-radius: 9999px (full pill)
- Background: rgba(20, 20, 102, 0.7) + backdrop-blur(20px) + blur saturation
- Border: 1px solid rgba(252,208,6,0.15)
- Box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(252,208,6,0.05) inset

Left side:
- Crown logo SVG (gold, 24px) + "WorldCrown48" wordmark (Pretendard, 14px, bold, #F2F2F5)

Center (desktop only):
- Navigation links: "THE PITCH" | "THE ARENA" | "RANKINGS"
- Font: Pretendard 13px, letter-spacing 0.1em, color: #B1B5C4
- Active: color #FCD006

Right side:
- Language switcher: "KO | EN" (mono 11px, muted)
- Login button: pill shape, background rgba(252,208,6,0.1), border 1px solid #FCD006
  Text: "Sign In" (13px, #FCD006)
- If logged in: User avatar circle (28px) + crown icon badge

Mobile:
- Bottom tab bar (not floating island)
- 4 icons: Home / Arena / Crown / Profile
- Active icon: #FCD006, inactive: #484B67
- Background: rgba(20,20,102,0.9) + blur
```

---

### [COMPONENT: Tournament Card (TournamentCard)]

```
Design a TournamentCard component for WorldCrown48:

Size: 320px wide × auto height. Border-radius: 20px.
Background: #241754. Border: 1px solid #2D1C5A.
Hover: border-color #FCD006, box-shadow: 0 0 24px rgba(252,208,6,0.15), scale(1.02).

Structure (top to bottom):
1. THUMBNAIL (aspect-ratio 16:9):
   - Full-width image (Contestant collage or tournament category visual)
   - Top-left badge: category pill — "FOOTBALL" / "K-POP" / "ANIME" / "CUSTOM"
     Style: #00003A background, #B1B5C4 text, 10px mono, letter-spacing 0.2em
   - Top-right badge (if active): "● LIVE" — red dot + text, #D7063A color, 10px

2. CARD BODY (padding: 16px 20px):
   - AI-Report badge: "● AI-Report" — 11px, mono, #FCD006, letter-spacing 0.08em
   - Tournament title: 18px, Pretendard bold, #F2F2F5, line-clamp 2
   - Metadata row (16px gap):
     · "48 Contestants" — crown icon + text, 13px, #B1B5C4
     · Tournament Deadline — calendar icon + "Jun 30", 13px, #B1B5C4
   - Status badge: pill shape, 11px mono uppercase
     · "active" → background rgba(0,163,183,0.15), border #00A3B7, text #00A3B7
     · "draft"  → background rgba(107,122,153,0.15), border #484B67, text #484B67
     · "completed" → background rgba(252,208,6,0.1), border #FCD006, text #FCD006

3. CTA BUTTON (full-width, at bottom):
   - Text: "Enter Tournament →"
   - Background: transparent, border: 1px solid rgba(252,208,6,0.3)
   - Hover: background rgba(252,208,6,0.1), border #FCD006
   - Font: 13px, Pretendard semibold, #FCD006

STRICT RULES:
✅ Show: category, title, contestant count, tournament deadline, status
❌ NEVER show: round number, round progress bar, vote count, "In Progress" text
❌ NEVER show: countdown timer, match count, vote statistics
```

---

### [COMPONENT: VS Battle Card (VSBattle)]

```
Design the VS Battle voting card for WorldCrown48 Arena:

Overall container:
- Full screen height (min-height: 100vh) or large card (max-width: 480px centered)
- Background: #00003A
- Noise overlay on top (opacity 0.035)

HEADER (at top):
- Round + Match indicator: "ROUND OF 48  ·  MATCH 7 / 24"
  Font: mono 12px, letter-spacing 0.2em, color #B1B5C4
- Tournament name below: 16px, Pretendard semibold, #F2F2F5
- Tournament Deadline (optional): "Tournament ends · May 31, 2026" — 12px, muted

VS BATTLE AREA (center, the main UI):
Two contestant panels side by side (50/50 split):

LEFT PANEL:
- Full-height background image of Contestant A (cover, slight blur at edges)
- Left-side color overlay: rgba(0,163,183,0.1) (turquoise tint)
- Contestant name: bottom-left, 20px bold, #F2F2F5, text-shadow
- "VOTE" button: pill, full-width, background #00A3B7, text #00003A, bold

RIGHT PANEL:
- Full-height background image of Contestant B (cover)
- Right-side color overlay: rgba(215,6,58,0.1) (crimson tint)
- Contestant name: bottom-right, 20px bold, #F2F2F5, text-shadow
- "VOTE" button: pill, full-width, background #D7063A, text #F2F2F5, bold

CENTER DIVIDER:
- "VS" symbol — 32px, Playfair Display italic bold, #FCD006
- Vertical dividing line: 1px, gradient from transparent → #FCD006 → transparent

SELECTED STATE (after user clicks):
- Selected side: 2px gold ring (outline), scale(1.05), bright glow
  Left selected: turquoise glow (box-shadow 0 0 32px rgba(0,163,183,0.4))
  Right selected: crimson glow (box-shadow 0 0 32px rgba(215,6,58,0.4))
- Unselected side: opacity 0.5, slight blur
- Confirm button appears: "✓ Confirm Vote" — gold pill, center bottom

STRICT RULES:
❌ NO countdown timer anywhere ("ENDS IN" is forbidden)
❌ NO vote count numbers ("1,234 votes" is forbidden)
❌ NO vote rate bar during active voting (only show after vote on ranking screen)
❌ NO "QUARTERFINAL", "SEMIFINAL", "ROUND OF 16" — these rounds don't exist in WC48
✅ Header shows: round name + match progress + tournament name
```

---

### [COMPONENT: Crown Card]

```
Design the Crown Card — the shareable result card after completing a tournament:

Size: 390 × 520px (portrait, optimized for mobile share). Border-radius: 24px.
Background: deep radial gradient from rgba(252,208,6,0.15) center → #00003A edges.
Gold glow border: 2px solid rgba(252,208,6,0.6), outer glow box-shadow.

TOP SECTION:
- WorldCrown48 crown logo (SVG, gold, 32px) centered
- "CROWN CARD" — 10px mono, letter-spacing 0.3em, #B1B5C4

CHAMPION SECTION (center):
- Large circular photo frame (160px diameter):
  Border: 3px solid #FCD006 + outer glow
  Animated: subtle pulse glow (goldPulse keyframe)
- Champion name: 28px, Playfair Display italic, #F2F2F5
- Tournament name below: 14px, mono, #B1B5C4, letter-spacing 0.1em

STATS ROW (3 columns, horizontal):
- "MY CHAMPION" label + crown icon
- "TOURNAMENT" label + bracket icon
- "ROUND" label + count (e.g., "5 Rounds")
All: 11px mono, #484B67 label / 14px bold #FCD006 value

AI-REPORT SECTION (optional, if AI news exists):
- Divider: 1px gold line, opacity 0.2
- "● AI-Report" badge: 11px, mono, #FCD006
- AI-generated headline about the Champion: 14px, #B1B5C4, line-clamp 2

SHARE BUTTONS (bottom):
- "Share on X" / "Share on Instagram" / "Copy Link"
- Ghost pill buttons with platform icons, 13px, #F2F2F5

FOOTER:
- "✦ AI-Report" — 12px, mono, #FCD006
- "worldcrown48.com" — 11px, muted
```

---

### [COMPONENT: AI-Report Badge]

```
Design the AI-Report badge for news cards and content in WorldCrown48:

VERSION A — Card byline badge (used in TournamentCard, NewsCard):
- Text: "● AI-Report"
- Font: JetBrains Mono / monospace, 11px, weight 600
- Color: #FCD006
- Letter-spacing: 0.08em
- No background, no border (inline text badge)
- The ● dot is a filled circle character, same color

VERSION B — Article inline block (used at bottom of news article body):
- Text: "✦ AI-Report"
- Font: monospace, 12px, #FCD006
- Top border: 1px solid rgba(252,208,6,0.2)
- Padding-top: 8px, margin-top: 16px
- Display: inline-block

STRICT RULES:
❌ NEVER write "AI GENERATED" — completely deprecated
❌ NEVER write "AI" alone as a badge
❌ NEVER use "AI-powered", "AI-generated" as badge text
✅ ONLY use "● AI-Report" or "✦ AI-Report"
```

---

## ═══════════════════════════════════════
## PART 3 — SCREEN DESIGNS (DOMAIN별)
## ═══════════════════════════════════════

---

### [SCREEN: Domain 0 — Launch Pad (Landing Page)]

```
Design the WorldCrown48 pre-launch landing page — Domain 0 "LAUNCH PAD":

PURPOSE: Capture email waitlist before the platform goes live. 
Build anticipation for the 2026 FIFA World Cup (June 2026 kickoff).
Tone: Epic. Cinematic. "The world is watching."

PAGE STRUCTURE (scroll sections):

━━━ SECTION 1: HERO (full-screen, 100vh) ━━━
Background: #00003A full-screen
Gold radial glow: centered, 600px diameter, rgba(252,208,6,0.08)
Noise overlay: full-screen grain, opacity 0.035

Floating Island GNB: top-center pill navigation
  - Logo + "WorldCrown48" + "KO | EN" language toggle

Center content (vertically + horizontally centered):
- Eyebrow label: "2026 WORLD CUP SEASON" — 11px mono, #B1B5C4, letter-spacing 0.25em
- Hero headline (2 lines):
    Line 1: "전 세계 팬덤의 심판" — 64px, Playfair Display italic, #F2F2F5
    Line 2: "WHO WEARS THE CROWN?" — 80px, Pretendard black, #FCD006, letter-spacing -0.02em
- Subheadline: "48 Contestants. Your vote. One Champion." — 18px, #B1B5C4
- FIFA 2026 Countdown timer (live, days/hours/minutes/seconds):
    4 number blocks, each: 56px bold #FCD006, label: 12px mono #484B67 ("DAYS" "HRS" "MIN" "SEC")
    Separated by ":" gold separator
- Email waitlist CTA:
    Input: pill shape, 280px wide, placeholder "your@email.com"
    Background: rgba(255,255,255,0.05), border: 1px solid #2D1C5A
    Button: "Join the Crown" — gold pill, #00003A text, Pretendard bold
    Below: "Be first. Thousands already waiting." — 12px, #484B67

Scroll indicator: bouncing chevron down, #FCD006, bottom-center

━━━ SECTION 2: SERVICE INTRODUCTION (3-card grid) ━━━
Background: #0E0944
Section title: "Why WorldCrown48?" — 36px, Pretendard bold, #F2F2F5, centered

3 feature cards (grid: 1col mobile / 3col desktop), each card:
- Card: #241754, border-radius 20px, padding 32px, border 1px solid #2D1C5A
- Icon: large (48px), gold color SVG
- Title: 20px, bold, #F2F2F5
- Description: 15px, #B1B5C4, line-height 1.6

Card 1 — Crown icon:
  "Fan Power"
  "48 Contestants enter. Only one claims the Crown. Your vote shapes history."

Card 2 — Vote icon:
  "Pure Fan Choice"
  "No algorithms. No predictions. Just fans deciding who deserves the crown."

Card 3 — AI icon (with "● AI-Report" badge):
  "AI-Powered Insights"
  "Our AI-Report tracks sentiment trends across millions of fan voices."
  Badge: "● AI-Report" (11px, #FCD006, mono) in top-right corner of card

━━━ SECTION 3: INTERACTIVE FEATURE CARDS ━━━
Background: #0F1244
Section title: "How It Works" — 32px, bold, centered

3 interactive micro-UI cards side by side:

CARD A — Tournament Shuffler (auto-rotating):
  Shows rotating tournament types every 3 seconds:
  ["FOOTBALL · World's Greatest Striker · 48 Players",
   "K-POP · Idol of the Decade · 48 Artists",
   "ANIME · Most Iconic Hero · 48 Heroes"]
  Stacked card animation, depth effect, spring physics

CARD B — Live Vote Feed (typewriter animation):
  "● LIVE FEED" indicator (turquoise ping dot)
  Typewriter text cycling through fan activity messages:
  "Fan #4,812 just voted for Son Heung-min"
  "New Crown candidate: Kylian Mbappé"
  Blinking gold cursor

CARD C — Match Journey Animator (GSAP highlight):
  "YOUR JOURNEY" header (mono, muted)
  5 rows: 48강 / 24강 / 12강 / 6강 / 결승
  Each showing match count, animated gold highlight cycling through rounds

━━━ SECTION 4: PHILOSOPHY / MANIFESTO ━━━
Background: #00003A, parallax background image (stadium crowd, opacity 0.08)

Center text (max-width 800px, centered):
- "Most platforms focus on:" — 18px, Pretendard, #B1B5C4, font-normal
- "Predicting the winner." — 22px, Pretendard, #F2F2F5, opacity 0.6
- Gold divider line: 60px wide, 1px, centered, margin 32px vertical
- "We let fans" — clamp(36px, 6vw, 72px), Playfair Display italic, #F2F2F5
- "DECIDE." — clamp(52px, 8vw, 96px), Pretendard black 900, #FCD006, letter-spacing -0.02em

━━━ SECTION 5: STICKY STACKING "HOW IT WORKS" CARDS ━━━
3 cards that pin-scroll and stack on top of each other:

Card 01 "ENTER THE ARENA":
  Background: #362261
  Step number: "01" — mono 11px, #FCD006
  Title: "Enter the Arena" — 32px, Pretendard bold, #F2F2F5
  Description: "48 Contestants. Your tournament. Your rules."
  Animation: rotating concentric circles SVG (4s cycle, gold stroke, opacity 0.3)

Card 02 "VOTE YOUR CHAMPION":
  Background: #00003A + turquoise/crimson side glows
  Step number: "02" — mono 11px, #FCD006
  Title: "Vote Your Champion" — 32px, bold
  Description: "One Match at a time. No predictions. Pure fan choice."
  Animation: horizontal laser line crossing dot grid (2s cycle, turquoise)

Card 03 "CLAIM YOUR CROWN":
  Background: #00003A + gold radial glow center
  Step number: "03" — mono 11px, #FCD006
  Title: "Claim Your Crown" — 32px, bold, #FCD006
  Description: "Your Champion is crowned. Share your Crown Card with the world."
  Animation: Crown logo SVG pulsing gold glow (goldPulse keyframe)

━━━ SECTION 6: FOOTER CTA ━━━
Background: #00003A
"Join the Crown" email CTA (repeated, compact version)
SNS links: Instagram / X (Twitter) / KakaoTalk channel
Copyright: "© 2026 WorldCrown48 | worldcrown48.com"
"System Operational" indicator: green dot + "All Systems Operational" (11px mono)
```

---

### [SCREEN: Domain 1 — The Pitch (Main Home)]

```
Design the WorldCrown48 main home page — Domain 1 "THE PITCH":

PURPOSE: Main entry after launch. Browse and discover trending tournaments.
Tone: Dynamic. High-energy. Sports app meets streaming platform.

PAGE STRUCTURE:

━━━ FLOATING ISLAND GNB ━━━
(Same as Launch Pad — floating pill at top)
Active state: "THE PITCH" link highlighted gold

━━━ SECTION 1: HERO BANNER ━━━
Background: full-width #00003A, gold radial glow center-left
Height: 50vh minimum

Left content:
- Category eyebrow: "TRENDING NOW" — 10px mono, #B1B5C4, letter-spacing 0.25em
- Tournament title (featured): 
  "World's Greatest Football Player 2026" — 44px, Pretendard bold 900, #F2F2F5
- Tournament meta:
  · "48 Contestants" — crown icon, 14px, #B1B5C4
  · "Tournament ends · Jun 30, 2026" — calendar icon, 14px, #B1B5C4
  · Status: "● LIVE" — turquoise, 12px mono
- CTA: "Enter Tournament →" — gold pill button, 48px height
- AI-Report badge: "● AI-Report" 11px #FCD006

Right content:
- Featured image: Contestant collage or hero image, border-radius 16px
- Subtle gold border glow

━━━ SECTION 2: CATEGORY TABS ━━━
Horizontal scrollable tabs:
"All" | "⚽ Football" | "🎵 K-POP" | "🎌 Anime" | "🏆 Custom"
Active tab: gold underline + text #FCD006
Inactive: #484B67, hover: #B1B5C4

━━━ SECTION 3: TOURNAMENT GRID ━━━
Grid: 1 column mobile / 2 columns tablet / 3 columns desktop
Gap: 20px
Components: TournamentCard (see COMPONENT section above)

Each TournamentCard shows:
- Thumbnail with category badge (top-left) + LIVE badge if active (top-right)
- "● AI-Report" byline badge
- Tournament title
- "48 Contestants" + Tournament Deadline
- Status badge (active/draft/completed)
- "Enter Tournament →" CTA

STRICT: No round progress bars. No vote counts. No match statistics on cards.

Loading state: Shimmer skeleton cards (same shape as TournamentCard)
Empty state: Crown icon + "No tournaments yet. Check back soon." text

━━━ SECTION 4: TRENDING STATS STRIP ━━━
Full-width dark strip (#0F1244), horizontal scroll:
Stats chips (auto-scrolling marquee):
"🔥 48 active tournaments" · "👑 12,847 Champions crowned this week" · "🌍 fans from 86 countries"
Font: 13px mono, #B1B5C4. Separator: gold dot.

━━━ MOBILE BOTTOM TAB BAR ━━━
4 tabs: 🏠 Home (active, gold) | ⚔️ Arena | 👑 Crown | 👤 Profile
Background: rgba(20,20,102,0.95) + backdrop blur
```

---

### [SCREEN: Domain 3 — The Arena (Voting Experience)]

```
Design the WorldCrown48 Arena voting screen — Domain 3 "THE ARENA":

PURPOSE: The core voting experience. Fans vote Match by Match until their Champion is crowned.
Tone: Intense. Immersive. Stadium energy at home.

━━━ SUB-SCREEN A: Tournament Detail View ━━━

Header:
- Back arrow (←) + "THE ARENA" breadcrumb — 12px mono, #B1B5C4
- Floating Island GNB (collapsed version)

Tournament banner:
- Large featured image (aspect 16:6) + dark overlay gradient bottom
- Tournament title overlay: 32px bold, #F2F2F5
- "48 Contestants" + Tournament Deadline (text, NOT timer countdown)
- Status badge: "● LIVE" or "active"
- "● AI-Report" badge if AI news is attached

Round summary (Voter's personal progress — NOT global stats):
- Current round label: "ROUND OF 48" — 14px mono, #FCD006
- Progress: "MATCH 7 / 24 completed" — 13px, #B1B5C4
  (Shows only the individual voter's personal progress)
- STRICTLY NO global round progress bar

CTA button (prominent):
- "Continue Voting" — large gold pill, full-width on mobile
- Or "Start Voting" if first time

Arena Newsroom (GNews feed):
- Section title: "Latest News" — 20px bold, #F2F2F5
- 3-column news card grid (desktop) / 1-column (mobile)
- Each NewsCard:
  · Thumbnail (aspect 16:9, border-radius 12px)
  · "● AI-Report" badge (top-left, 11px, #FCD006) — only if AI-generated
  · Headline: 15px bold, #F2F2F5, line-clamp 2
  · Source + date: 12px, #484B67
  · Read more link: 12px, #FCD006

━━━ SUB-SCREEN B: VS Battle Voting View ━━━
(Full implementation — see [COMPONENT: VS Battle Card] above)

Additional screen context:
- URL pattern: /en/arena/[tournamentId]/vote
- The screen is full-height, minimal chrome
- After vote confirmation: brief celebration animation (gold particles burst from selection)
  Then: automatically slide to next Match
- If round complete: "ROUND OF 48 COMPLETE" full-screen modal
  Gold crown animation + "Advancing to ROUND OF 24" text
  "Continue to Next Round" button

━━━ SUB-SCREEN C: THE FINAL — 3-Way Vote ━━━

IMPORTANT: THE FINAL shows 3 Contestants simultaneously — NOT 2.
This is NOT split into two 1v1 matches.

Layout:
- Header: "THE FINAL" — 20px mono, #FCD006, letter-spacing 0.2em
           "Choose Your Champion" — 14px, #B1B5C4
- 3 Contestant panels (vertical stack on mobile / 3-column row on desktop):
  Each panel: image + name + "VOTE FOR [NAME]" button
  Gold radial glow pulses on each panel alternately
- Vote button: gold pill, "#00003A text", Pretendard bold
- After selection: celebration → Crown Card generation screen

━━━ SUB-SCREEN D: Crown Card Generation ━━━
(See [COMPONENT: Crown Card] above)

Screen flow:
1. Champion confirmation: "Your Champion is [Name]!" — 32px, Playfair italic, gold
2. Crown Card appears with reveal animation (scale 0.8 → 1.0 + glow)
3. Share buttons: "Share on X" / "Share to Instagram Stories" / "Copy Link"
4. "● AI-Report" news article about the Champion (if generated)
   Article footer: "✦ AI-Report" badge

━━━ RESPONSIVE RULES ━━━
Mobile (375px): Full-screen VS panels, swipe gesture support, bottom vote buttons
Tablet (768px): Side-by-side panels with news column
Desktop (1440px): Full immersive layout, wider panels, visible GNB
```

---

### [SCREEN: Domain 2 — The Lab (Admin Tournament Builder)]

```
Design the WorldCrown48 admin tournament builder — Domain 2 "THE LAB":

PURPOSE: Admin-only interface for creating and managing tournaments.
ACCESS: role === "admin" only. Others see 404. URL: /admin/lab
Responsive: Desktop-first (1440px primary). Tablet supported. Mobile: simplified.
Tone: Professional dark studio tool. Precise. Efficient.

━━━ ADMIN LAYOUT SHELL ━━━
Left sidebar (240px fixed):
- "THE LAB" header — 16px mono, #FCD006
- Navigation links: Dashboard / New Tournament / Manage / Settings
- Bottom: Admin user avatar + logout

Main content area (right, scrollable)

━━━ STEP-BY-STEP TOURNAMENT WIZARD ━━━

Step indicator at top (3 steps):
  [1] Basic Info → [2] Settings → [3] Deadline
  Active step: gold circle, completed: turquoise checkmark, pending: dark circle

STEP 1 — Basic Information:
- Tournament Title input: large text field, placeholder "Enter tournament name..." (max 60 chars)
- Category select: dropdown — "Football" / "K-POP" / "Anime" / "Custom"
  Custom option allows free-text category name
- Description textarea: optional, max 200 chars, char counter bottom-right
- All inputs: dark background (#241754), border #2D1C5A, focus border #FCD006

STEP 2 — Settings (3 toggle switches):
Toggle 1: "AI News Generation" — default ON
  Description: "Auto-generate ● AI-Report articles for key moments"
Toggle 2: "Multilingual News" — default ON
  Description: "Enable Korean + English news output"
Toggle 3: "Show Ranking" — default ON
  Description: "Display Vote Rate (%) leaderboard after tournaments complete"
  
Toggle style: pill switch, ON: #00A3B7, OFF: #2D1C5A

STEP 3 — Tournament Deadline:
- Date picker: calendar UI, dark styled
- Time picker: 24h format, UTC display
- Auto-extend toggle: "Auto-extend by 48h if minimum matches not completed"
- Preview text: "Tournament ends: June 30, 2026 23:59 UTC"

━━━ 48 NODES GRID (Contestant Entry) ━━━
After wizard: 48-slot grid for Contestant entry

Layout: 6 columns × 8 rows grid
Navigation: 8 pages of 6 nodes each (page 1/8, 2/8...)

Progress bar at top: "Page 3 / 8 · 18 / 48 Contestants added"
Bar fill: #FCD006, track: #2D1C5A, border-radius 9999px

Individual Node (6 per row):
Empty state:
- Dashed border: #2D1C5A
- Center: camera icon (#484B67) + number "07" (gold, mono, large)
- Click: opens image upload modal

Filled state:
- Contestant thumbnail (square, cover)
- Name overlay (bottom, gradient): Pretendard 13px bold, #F2F2F5
- Edit icon (pencil) on hover top-right corner

AI Fill button (prominent):
- "✦ AI Fill All 48" — gold pill button
- Triggers Claude API to auto-suggest 48 Contestants based on tournament title
- Loading: skeleton animation on all empty nodes simultaneously

━━━ SAVE & PUBLISH BAR (sticky bottom) ━━━
- Left: "18 / 48 Contestants added" status
- Right: "Save Draft" (ghost button) + "Publish Tournament" (gold pill, disabled until 48/48)
```

---

## ═══════════════════════════════════════
## PART 4 — RESPONSIVE BREAKPOINTS
## ═══════════════════════════════════════

```
BREAKPOINTS:
  Mobile:  375px — single column, bottom tab bar, swipe gestures
  Tablet:  768px — 2 columns, side panels visible
  Desktop: 1440px — full layout, 3 columns, floating island GNB

MOBILE-FIRST RULES:
- All touch targets: minimum 44 × 44px
- VS Battle: full-screen panels, no sidebar
- Cards: full-width, single column
- GNB: transforms to bottom tab bar
- Font sizes: slightly smaller (multiply by 0.85)
- Padding: 16px horizontal minimum

DESKTOP ENHANCEMENTS:
- 3-column tournament grid
- Side panel for news in Arena
- Hover states (magnetic button effect)
- Larger hero typography (clamp to max values)
- Mouse-following magnetic button effect on CTAs
```

---

## ═══════════════════════════════════════
## PART 5 — QUICK REFERENCE CHEATSHEET
## (Stitch에 붙이는 짧은 버전)
## ═══════════════════════════════════════

```
WORLDCROWN48 QUICK DESIGN SPEC — USE THIS WHEN CONTEXT IS LIMITED:

Colors (dark theme):
  bg-deep: #00003A | bg-default: #0E0944 | bg-soft: #241754
  gold: #FCD006 | turquoise: #00A3B7 | crimson: #D7063A
  text: #F2F2F5 | text-sub: #B1B5C4 | text-muted: #484B67

Fonts: Playfair Display (display/italic) + Pretendard (UI) + JetBrains Mono (badges/stats)

Round names ONLY: ROUND OF 48 / ROUND OF 24 / ROUND OF 12 / ROUND OF 6 / THE FINAL
Never: ROUND OF 16, QUARTERFINAL, SEMIFINAL, ROUND OF 32

Match progress format: "ROUND OF 48 · MATCH 7 / 24"
Tournament Deadline: ✅ show | Round Deadline: ❌ doesn't exist
Vote Count (numbers): ❌ never show | Vote Rate (%): ✅ ranking screen only
AI badge: "● AI-Report" (11px, #FCD006) | NEVER "AI GENERATED"
THE FINAL: 3 Contestants shown simultaneously (NOT 2x 1v1 splits)
Status: "active" (NOT "In Progress")
```

---

## ═══════════════════════════════════════
## PART 6 — STITCH EXAMPLE PROMPTS
## (복사해서 바로 사용하세요)
## ═══════════════════════════════════════

### 빠른 시작 — Domain 0 Hero Section

```
Create a full-screen hero section for WorldCrown48, a global fan voting tournament platform.
Dark cinematic style. Background: deep navy #00003A with a centered gold radial glow (rgba(252,208,6,0.08)).
Full-screen noise grain overlay (opacity 0.035).

Top: floating pill navigation bar (backdrop blur, gold border tint).

Center content:
- Eyebrow: "2026 WORLD CUP SEASON" (11px monospace, #B1B5C4, letter-spacing 0.25em)
- Headline line 1: "전 세계 팬덤의 심판" (64px, Playfair Display italic, #F2F2F5)
- Headline line 2: "WHO WEARS THE CROWN?" (80px, ultra bold, #FCD006, letter-spacing -0.02em)
- Subtext: "48 Contestants. Your vote. One Champion." (18px, #B1B5C4)
- Countdown timer: 4 blocks for DAYS/HRS/MIN/SEC, gold numbers (56px bold), dark card backgrounds
- Email input + "Join the Crown" gold pill CTA button (inline layout)

Bottom: bouncing gold chevron scroll indicator.
Mobile responsive: 375px / Tablet: 768px / Desktop: 1440px
```

### 빠른 시작 — VS Battle Voting Screen

```
Create a full-screen VS Battle voting interface for WorldCrown48 tournament app.
Background: #00003A with noise overlay.

Top header: "ROUND OF 48  ·  MATCH 7 / 24" (12px monospace, #B1B5C4)
Tournament name below header: 16px Pretendard, #F2F2F5.

Main area: two contestant panels split 50/50:
LEFT: Photo of Contestant A. Turquoise overlay tint (rgba(0,163,183,0.1)). 
      Name bottom-left (20px bold). "VOTE" button (turquoise #00A3B7, pill shape).
CENTER: "VS" in gold (32px Playfair italic). Vertical gold gradient divider.
RIGHT: Photo of Contestant B. Crimson overlay tint (rgba(215,6,58,0.1)).
      Name bottom-right (20px bold). "VOTE" button (crimson #D7063A, pill).

Selected state: 2px gold ring + glow on selected side, unselected side dims to 50% opacity.
Confirm button: "✓ Confirm Vote" gold pill, appears center-bottom after selection.

IMPORTANT: NO countdown timer. NO vote count numbers. NO round progress bars.
```

### 빠른 시작 — Tournament Card Grid

```
Create a tournament browse page for WorldCrown48 with a card grid.
Background: #0E0944 page, #241754 cards.

Floating pill GNB at top. Category tabs below: All / Football / K-POP / Anime / Custom.

Tournament cards (3-column desktop grid, 320px wide each, border-radius 20px):
Each card:
1. 16:9 thumbnail with category badge (top-left: "FOOTBALL" 10px mono) + "● LIVE" badge (top-right if active)
2. Body: "● AI-Report" badge (11px, #FCD006, mono) + tournament title (18px bold) + 
   "48 Contestants" + deadline date (both 13px, #B1B5C4) + status badge
3. "Enter Tournament →" full-width ghost button at bottom (gold text, gold border)

Hover: gold ring border, subtle gold glow, scale(1.02).
Loading: shimmer skeleton cards.

RULES: NO round info. NO vote counts. NO match statistics. NO timers.
```

---

*© 2026 WorldCrown48 | WC48_Stitch_DesignSpec_v1.0.md | CONFIDENTIAL*
*Based on: WC48_DESIGN_SYSTEM_v2.3.md + WorldCrown48_v4_9.md + DESIGN_BRIEF.md v1.1*
*작성: 48티오 | 2026-05-24*
