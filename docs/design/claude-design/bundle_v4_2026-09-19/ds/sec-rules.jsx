/* WorldCrown48 DS — Rules: the v2.4 contract · terminology · do/don't · glossary */

function SecRules() {
  const rules = [
    "Crown Gold #FCD006 is the only point color. Crimson & Turquoise are state-only. Pure black is banned.",
    "Dark theme for Domain 0–3, light for Domain 4–6. Never mix on one screen.",
    "Radii are angular — 0, 5px, 999px. Nothing between.",
    "Three families: Inter (UI), Playfair Display (italic display, Latin only), JetBrains Mono (numerals/tags). Pretendard resolves Korean.",
    "✦ AI-Report appears only as a news-article footer. AI GENERATED and the ● AI-Report card byline are retired.",
    "Round labels appear only in the round-transition announcement — never on the Match VS surface, TournamentCard, GNB, or footers.",
    "Round names: ROUND OF 48 / 24 / 12 / 6 + THE FINAL. FIFA terms (QUARTERFINAL, SEMIFINAL, ROUND OF 16) are banned.",
    "No LIVE badge anywhere. WC48 does not live-stream.",
    "No vote rate (%) on the Match VS screen — it biases the next Fan. Vote rate is for the Ranking surface only.",
    "Only Tournament Deadline exists. No Match or Round deadline. No “ENDS IN”.",
    "No emoji. No predictions / odds / betting language. No “FIFA” / “Official” text.",
    "Use registered SVG brand assets only. Never redraw the crown.",
  ];
  const terms = [
    ["Tournament", "이상형 월드컵 event of 48 Contestants", "event · contest · game"],
    ["Contestant", "the picked entity — person, team, song, anything", "candidate · participant"],
    ["Match", "one 1:1 pick within a Round", "battle · round"],
    ["Fan", "the participant making picks (code/DB: Voter)", "user · Voter (화면 금지)"],
    ["Champion", "the final pick after THE FINAL", "winner · #1"],
    ["Crown Card", "the shareable result artifact", "result image"],
    ["Tournament Deadline", "the only deadline that exists", "Round Deadline (n/a)"],
    ["Vote Rate (%)", "the only vote figure shown in UI", "Vote Count (absolute)"],
    ["active", "the live tournament status", "In Progress"],
  ];
  return (
    <Section id="rules" num="05 — CONTRACT" title="Rules &amp; terminology"
      desc="The v2.4 contract is binding. Where the cinematic spec and the contract conflicted, the contract wins — that is why the vote feed is never labelled LIVE.">

      <Block label="Twelve inviolable rules">
        <div className="stage stage--col" style={{ padding: 0, display: "block" }}>
          <table className="spec">
            <tbody>
              {rules.map((r, i) => (
                <tr key={i}>
                  <td className="spec__token" style={{ width: 36, textAlign: "right", color: "var(--color-gold)" }}>{String(i + 1).padStart(2, "0")}</td>
                  <td className="spec__desc">{r}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Block>

      <Block label="Do / Don't">
        <div className="ds-grid ds-grid--2">
          <Rule kind="do" title="Round in its place">Show the round name only on the full-screen round-transition announcement between rounds — “🚩 ROUND OF 24”. (No emoji in production copy.)</Rule>
          <Rule kind="dont" title="Round HUD on the Match">Never put <code>ROUND OF 48 · MATCH 7/24</code> or a progress bar on the VS surface. The Fan is a player, not a spectator.</Rule>
          <Rule kind="do" title="Tournament Deadline only">Surface <code>Tournament ends · May 31</code> where a date is needed.</Rule>
          <Rule kind="dont" title="Match timers">Never render <code>ENDS IN 03:14:22</code> — Matches and Rounds have no time.</Rule>
          <Rule kind="do" title="Vote Rate on Ranking">Show <code>34.5%</code> only after voting, on the Ranking surface.</Rule>
          <Rule kind="dont" title="Vote Count anywhere">Never show <code>1,234 votes</code> or live rates during a Match.</Rule>
          <Rule kind="do" title="✦ AI-Report footer">Place the badge once, at the bottom of a news article.</Rule>
          <Rule kind="dont" title="AI badges on cards">Never put <code>● AI-Report</code>, <code>AI GENERATED</code>, or a LIVE pill on a card, banner, or box.</Rule>
        </div>
      </Block>

      <Block label="Terminology — immutable">
        <div className="gloss">
          {terms.map(([term, def, banned]) => (
            <div className="gloss__row" key={term}>
              <div className="gloss__term">{term}<span>✗ {banned}</span></div>
              <div className="gloss__def">{def}</div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="Sources" note="This system reconciles the card gallery and the integrated app against CLAUDE.md, DESIGN_BRIEF.md, WC48_DESIGN_SYSTEM_v2.4.md and WorldCrown48 strategy v4.9. Tokens resolve from colors_and_type.css.">
      </Block>
    </Section>
  );
}

window.SecRules = SecRules;
