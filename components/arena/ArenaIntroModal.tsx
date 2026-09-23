/**
 * ArenaIntroModal — 첫 입장 안내 팝업 (ARENA-1 PR 2b · 디자인 24~26 · 원장 D-13 · D-17 ②).
 *
 * 아레나에 처음 들어온 팬에게 매치를 소개하고, 이 선택이 데이터로 어떻게 쓰이는지 알린다.
 * **기기당 1회**(lib/arena/introSeen) · 닫기 전에는 선택할 수 없다(focus-trap) · 뒤 무대는 어둡게.
 *
 * 필수 문장: "Crown Card는 Tournament가 끝난 뒤 공개됩니다"(원장 D-13 바뀜 2026-09-23).
 * 모바일 **세로에서만** "가로로 돌리면 무대가 더 크게 열립니다" 한 줄(D-17 ② · 기존 키 재사용).
 *
 * 팝업 머리의 크라운 아이콘은 **무대가 아니므로 D-28 의 금지 대상이 아니다**(D-28 보충 09-23).
 */
"use client";

import { useEffect, useState } from "react";
import FocusTrap from "focus-trap-react";
import { useT } from "@/lib/i18n/useT";
import { markIntroSeen, shouldShowIntro } from "@/lib/arena/introSeen";
import type { StageMode } from "@/lib/arena/stageLayout";
import styles from "./introModal.module.css";

interface ArenaIntroModalProps {
  /** 지금 무대 배치 — 세로에서만 회전 안내 한 줄이 붙는다. */
  mode: StageMode;
  /** 팬이 닫은 뒤(선택을 시작할 수 있게 된 뒤) 알린다. */
  onClose?: () => void;
}

export function ArenaIntroModal({ mode, onClose }: ArenaIntroModalProps): JSX.Element | null {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  // 첫 렌더에서는 그리지 않는다 — 서버와 같은 화면으로 시작하고(hydration), 마운트 뒤 판단한다.
  useEffect(() => {
    setOpen(shouldShowIntro(typeof window === "undefined" ? null : window.localStorage));
  }, []);

  if (!open) return null;

  const close = (): void => {
    markIntroSeen(typeof window === "undefined" ? null : window.localStorage);
    setOpen(false);
    onClose?.();
  };

  return (
    <div className={styles.overlay} data-testid="arena-intro" role="presentation">
      <FocusTrap focusTrapOptions={{ initialFocus: "#arena-intro-start", escapeDeactivates: false }}>
        <div
          className={styles.card}
          role="dialog"
          aria-modal="true"
          aria-labelledby="arena-intro-welcome"
        >
          <div className={styles.brand}>
            {/* 브랜드 머리 — 팝업은 무대가 아니라 D-28 예외(보충 2026-09-23). */}
            <img src="/brand/wc48-crown-filled.svg" alt="" width={24} height={24} aria-hidden="true" />
            <span className={styles.brandName}>WORLDCROWN48</span>
          </div>

          <h2 id="arena-intro-welcome" className={styles.welcome}>
            {t("arena.intro.welcome")}
          </h2>
          <p className={styles.data}>{t("arena.intro.data")}</p>
          <p className={styles.crownCard}>{t("arena.intro.crownCard")}</p>

          {mode === "portrait" ? (
            <p className={styles.rotate} data-testid="arena-intro-rotate">
              {t("arena.stage.rotateHint")}
            </p>
          ) : null}

          <button
            type="button"
            id="arena-intro-start"
            className={styles.start}
            data-testid="arena-intro-start"
            onClick={close}
          >
            {t("arena.intro.start")}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
