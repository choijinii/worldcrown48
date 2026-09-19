export interface TournamentCardProps {
  category?: "K-POP" | "OTHER";
  title?: string;
  contestants?: number;
  deadline?: string;
  status?: "draft" | "published" | "active" | "closed" | "completed";
  /** CSS background for the cover band. */
  cover?: string;
}

/** The Pitch card. Meta is exactly: category · title · {N} Contestants · Tournament
 *  Deadline · status. No Round progress, no vote count, no LIVE, no AI-Report. */
export declare function TournamentCard(props: TournamentCardProps): JSX.Element;
