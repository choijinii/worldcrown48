export interface AIReportFooterProps {
  /** Relative time shown after the badge, e.g. "2 hours ago". */
  timestamp?: string;
}

/** ✦ AI-Report — the ONLY allowed AI surface, and only at the foot of a news article.
 *  Never render this on a card, banner, box, or list item. */
export declare function AIReportFooter(props: AIReportFooterProps): JSX.Element;
