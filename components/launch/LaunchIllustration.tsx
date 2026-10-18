"use client";

/**
 * LaunchIllustration — 사전등록 페이지 그림 자리 (PRE-REG-1 · 원장 D-54).
 *
 * 왕관·슬로건(LaunchHero) 바로 아래, 추천 대회·이메일 칸보다 위. 데스크톱·태블릿은 원래 비율
 * (2068×499) 그대로 콘텐츠 폭 가득, 휴대폰(≤480)은 가운데를 중심으로 더 높게 자른다(.lp-illust).
 * 그림 위에 글자를 얹지 않는다. 그림이 없거나(LAUNCH_ILLUSTRATION = null) 불러오지 못하면 자리를
 * 그리지 않는다 — 빈 상자 금지.
 */
import { useState } from "react";
import Image from "next/image";
import { useT } from "@/lib/i18n/useT";
import { LAUNCH_ILLUSTRATION, LAUNCH_ILLUSTRATION_MOBILE_ASPECT } from "@/lib/launch/illustration";

export function LaunchIllustration() {
  const { t } = useT();
  const [failed, setFailed] = useState(false);
  const ill = LAUNCH_ILLUSTRATION;
  if (!ill || failed) return null;

  return (
    <figure
      className="lp-illust"
      data-testid="launch-illustration"
      style={
        {
          "--lp-illust-ratio": `${ill.width} / ${ill.height}`,
          "--lp-illust-ratio-mobile": `${LAUNCH_ILLUSTRATION_MOBILE_ASPECT} / 1`,
        } as React.CSSProperties
      }
    >
      <Image
        src={ill.src}
        alt={t("launch.illustration.alt")}
        fill
        sizes="(max-width: 800px) 100vw, 760px"
        onError={() => setFailed(true)}
      />
    </figure>
  );
}
