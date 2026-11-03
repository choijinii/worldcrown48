export type NavLabel = "The Pitch" | "The Arena" | "Record Room" | "Newsroom" | "Locker Room";
export interface MenubarProps { variant?: "desktop" | "mobile"; current?: NavLabel; admin?: boolean; dropdown?: "Record Room" | null; currentSub?: string | null; open?: boolean; onMenu?: () => void; lang?: "KO" | "EN" | "ES"; avatar?: string; signInLabel?: string | null; crownSrc?: string; style?: React.CSSProperties; }
export interface DrawerProps { variant?: "desktop" | "mobile"; open?: boolean; onClose?: () => void; expanded?: Record<string, boolean>; current?: string; admin?: boolean; lang?: "ko" | "en" | "es"; onLang?: (lang: "ko" | "en" | "es") => void; onNavigate?: (label: string) => void; crownSrc?: string; style?: React.CSSProperties; }
export declare function Menubar(p: MenubarProps): JSX.Element;
export declare function Drawer(p: DrawerProps): JSX.Element;
