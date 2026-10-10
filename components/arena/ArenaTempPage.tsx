"use client";

/**
 * ArenaTempPage — `/arena` 임시 페이지의 본문 (NAV-1 E2 · §3-B). ARENA-2 가 아레나 홈으로 교체한다.
 * 화이트 면(D-40) · 제목 "The Arena" · 안내 한 줄 · The Pitch 링크 1개. 데이터 읽기 없음.
 */
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

const STYLE = `
.arena-temp { min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 96px 16px; background: var(--color-bg-light); color: var(--color-text-light); font-family: var(--font-sans); }
.arena-temp-inner { max-width: 560px; text-align: center; }
.arena-temp h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.015em; }
.arena-temp p { margin: 12px 0 0; font-size: 15px; color: var(--color-text-sub-light); }
.arena-temp a { display: inline-block; margin-top: 24px; font-size: 15px; font-weight: 600; color: var(--color-text-light); }
.arena-temp a:focus-visible { outline: 2px solid var(--color-gold-ink); outline-offset: 2px; }
`;

export function ArenaTempPage(): JSX.Element {
  const { t } = useT();
  return (
    <main className="arena-temp" data-theme="light" data-testid="arena-temp">
      <style>{STYLE}</style>
      <div className="arena-temp-inner">
        <h1>The Arena</h1>
        <p>{t("arena.temp.intro")}</p>
        <Link href="/" data-testid="arena-temp-pitch">
          {t("arena.temp.toPitch")}
        </Link>
      </div>
    </main>
  );
}
