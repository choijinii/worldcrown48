export interface VSContestant {
  name: string;
  /** e.g. "KR · VOCAL · MAIN" */
  meta: string;
  /** Latin monogram — Playfair Display is Latin-only. */
  initial: string;
  /** "r,g,b" triplet: turquoise left, crimson right. */
  tint: string;
}

/** The Arena's 1:1 Match surface. No Round/Match HUD, no timer, no Vote Rate —
 *  the Voter is a player, not a spectator. */
export declare function VSBattle(props: {
  tournament?: string;
  year?: string;
  left?: VSContestant;
  right?: VSContestant;
  onVote?: (side: "left" | "right") => void;
}): JSX.Element;
