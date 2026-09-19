import * as React from "react";

export interface ButtonProps {
  children?: React.ReactNode;
  /** Visual weight. `gold` is the primary CTA — the only point colour. */
  variant?: "gold" | "ghost" | "quiet";
  /** All sizes keep a >=44px hit target at `md` and above. */
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** WorldCrown48 primary action. Crown Gold is the only point colour. */
export declare function Button(props: ButtonProps): JSX.Element;
