"use client";

/**
 * ChartsList — `/records` Charts 대회 목록 화면 (NAV-1 G · 프롬프트 §3-C · 정본 31 · 32).
 *
 * 다크(차트와 같은 토큰 · D-40) · 목록형(카드·썸네일 없음) · 폭 970 가운데.
 * 줄 = 대회 제목(지금 언어) · 카테고리 칩 · (끝난 대회만) 챔피언 · "차트 보기 ›" → 그 대회 차트.
 * 배너 자리 `records-below` 는 목록 아래 한 곳(D-21).
 *
 * 데이터는 서버(app/records/page.tsx)가 읽어 넘긴다. 여기는 언어 고르기와 그리기만 한다.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { localizedTitle } from "@/lib/tournamentTitle";
import { chartHref } from "@/lib/records/chartList";
import type { ChartRowData, RecordsData } from "@/lib/records/recordsData";
import type { BannerVariant } from "@/lib/banner/bannerVariant";
import { BannerSlot } from "@/components/layout/BannerSlot";
import styles from "./chartsList.module.css";

/** 배너 크기 — 서버와 첫 렌더는 데스크톱으로 같고(하이드레이션), 마운트 뒤 폭으로 정한다. */
function useBannerVariant(): BannerVariant {
  const [v, setV] = useState<BannerVariant>("desktop");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const apply = () => setV(mq.matches ? "mobile" : "desktop");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return v;
}

export function ChartsList({ data }: { data: RecordsData }): JSX.Element {
  const { t, lang } = useT();
  const variant = useBannerVariant();

  const row = (r: ChartRowData, ended: boolean) => (
    <li key={r.id} className={styles.row} data-testid="records-row">
      <span className={styles.title}>{localizedTitle({ title: r.title, titleI18n: r.titleI18n }, lang)}</span>
      {r.chip && <span className={styles.chip}>{r.chip}</span>}
      {ended && r.champion && (
        <span className={styles.champ}>
          <span className={styles.champLabel}>{t("records.champion")}</span>
          <span className={styles.champName}>{r.champion}</span>
        </span>
      )}
      <Link href={chartHref(r.id)} className={styles.view} data-testid="records-view-chart">
        {t("records.viewChart")}
      </Link>
    </li>
  );

  return (
    <main className={styles.page} data-testid="records-page">
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{t("records.eyebrow")}</p>
        <h1 className={styles.h1}>{t("records.title")}</h1>
        <p className={styles.sub}>{t("records.sub")}</p>

        {data.active.length > 0 && (
          <section className={styles.group} data-testid="records-active">
            <h2 className={styles.groupLabel}>{t("records.active")}</h2>
            <ul className={styles.list}>{data.active.map((r) => row(r, false))}</ul>
          </section>
        )}

        <section className={styles.group} data-testid="records-ended">
          <h2 className={styles.groupLabel}>{t("records.ended")}</h2>
          {data.ended.length > 0 ? (
            <ul className={styles.list}>{data.ended.map((r) => row(r, true))}</ul>
          ) : (
            <p className={styles.empty} data-testid="records-empty">{t("records.empty")}</p>
          )}
        </section>

        <div className={styles.banner}>
          <BannerSlot slot="records-below" variant={variant} className={styles.bannerSlot} />
        </div>
      </div>
    </main>
  );
}
