/**
 * LabIcon — 편집기 STEP 2 결과물 버튼 앞 선 아이콘 (ENTRY-UNIT-1 · 대표 요청 2026-10-28).
 *
 * ☰ 서랍 아이콘(components/layout/NavIcon.tsx)과 같은 규격이다: Lucide 선 아이콘 ·
 * 20px · stroke 1.75 · 글자색(currentColor). 버튼 글자 앞의 이모지(🎬·🖼)를 대신한다 —
 * 이모지는 기기마다 그림이 달라 서랍과 한 벌로 보이지 않았다. 새 패키지 없이 path 를 옮겼다.
 */
const ICONS = {
  // clapperboard — [동영상 생성]
  video: [
    "M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z",
    "m6.2 5.3 3.1 3.9",
    "m12.4 3.4 3.1 4",
    "M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  ],
  // image — [이미지 생성]
  image: [
    "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
    "M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",
  ],
} as const;

export type LabIconName = keyof typeof ICONS;

export function LabIcon({ name }: { name: LabIconName }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
