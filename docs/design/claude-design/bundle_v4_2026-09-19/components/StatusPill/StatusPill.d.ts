export interface StatusPillProps {
  /** The five — and only five — Tournament states. */
  status?: "draft" | "published" | "active" | "closed" | "completed";
}

/** Tournament state chip. Never "In Progress", never a LIVE pill — WC48 does not live-stream. */
export declare function StatusPill(props: StatusPillProps): JSX.Element;
