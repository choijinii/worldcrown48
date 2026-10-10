export interface MenubarProps { current?: "The Pitch"|"The Arena"|"Record Room"|"Newsroom"|"Locker Room"; admin?: boolean; open?: "The Arena"|"Record Room"|"Newsroom"|null; currentSub?: string|null; lang?: "KO"|"EN"|"ES"; avatar?: string; signInLabel?: string|null; style?: React.CSSProperties; }
export interface DrawerProps { current?: string; expanded?: Record<string, boolean>; admin?: boolean; width?: number; height?: number; lang?: "KO"|"EN"|"ES"; style?: React.CSSProperties; }
export declare function Menubar(p: MenubarProps): JSX.Element;
export declare function Drawer(p: DrawerProps): JSX.Element;
