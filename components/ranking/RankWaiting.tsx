/**
 * RankWaiting — 차트가 아직 열리지 않았을 때의 안내.
 *
 * 두 경우를 하나로 합쳤다(대표 2026-09-24): ① 대회 전체 완주 판수가 10에 닿지 않았다
 * (정본 §5) ② 캐시 문서가 아직 없다. 팬에게는 같은 상황이라 같은 문구를 보여 준다.
 *
 * **차트로 가는 길은 숨기지 않는다** — 먼저 온 팬은 차트가 궁금하다(정본 §5).
 * 판수는 화면에 그리지 않는다. 몇 판인지는 팬의 관심사가 아니다.
 */
export function RankWaiting({ title }: { title: string }): JSX.Element {
  return (
    <div className="rank-empty" data-testid="rank-waiting">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wc48-crown-circle-outline.svg" alt="" />
      <div className="et">{title}</div>
    </div>
  );
}
