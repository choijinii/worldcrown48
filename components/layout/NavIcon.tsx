/**
 * NavIcon — ☰ 서랍 대분류 앞 선 아이콘 (NAV-1 · 정본 v4 GNB.jsx `ICONS`).
 *
 * Lucide 선 아이콘 20px · stroke 1.75 · 글자색(currentColor). 새 패키지 없이 정본의 path 데이터를
 * 그대로 옮겼다. 하위 줄에는 아이콘이 없다.
 */
const ICONS = {
  // layout-grid
  pitch: ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"],
  // square-split-horizontal
  arena: [
    "M8 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3",
    "M16 5h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3",
    "M12 4v16",
  ],
  // bar-chart-3
  records: ["M3 3v18h18", "M18 17V9", "M13 17V5", "M8 17v-3"],
  // newspaper
  newsroom: [
    "M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2",
    "M18 14h-8",
    "M15 18h-5",
    "M10 6h8v4h-8V6Z",
  ],
  // user
  locker: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"],
  // shield-check
  policy: [
    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    "m9 12 2 2 4-4",
  ],
  // flask-conical
  lab: [
    "M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2",
    "M8.5 2h7",
    "M7 16h10",
  ],
  // layout-dashboard
  adminDashboard: ["M3 3h7v9H3z", "M14 3h7v5h-7z", "M14 12h7v9h-7z", "M3 16h7v5H3z"],
  // pen-line
  newsDesk: [
    "M12 20h9",
    "M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",
  ],
} as const;

export type NavIconName = keyof typeof ICONS;

export function NavIcon({ name }: { name: NavIconName }): JSX.Element {
  return (
    <svg
      className="wc-drawer-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
