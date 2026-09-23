export interface BannerSlotProps {
  /** 970x90 desktop slot or 320x100 mobile-portrait slot. No other size exists. */
  variant?: "desktop" | "mobile";
  /** Chooses the default notice line. */
  state?: "signed-out" | "signed-in";
  lang?: "ko" | "en" | "es";
  /** Overrides the default notice line. One line of text only. */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function BannerSlot(props: BannerSlotProps): JSX.Element;
