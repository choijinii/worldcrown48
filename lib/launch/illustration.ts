/**
 * 사전등록 페이지 그림 (PRE-REG-1 · 원장 D-54 · D-27 바뀜 2026-10-17).
 *
 * 소재 = 대표 일러스트 `Gemini-illust-001.png`(왕좌 셋 · 2068×499). 실존 인물 사진·닮은 그림 금지는
 * 그대로(D-27) — 대표가 10/17 세 인물이 실존 인물과 닮지 않았음을 확인했다.
 * 원본 PNG(1.7MB)를 webp(q90 · PSNR 46.9dB · 111KB)로 바꿨다 — 크기·비율은 원본 그대로.
 *
 * 그림을 내리려면 null 로 둔다 — 자리 자체를 그리지 않는다(빈 상자 금지).
 */
export interface LaunchIllustration {
  src: string;
  width: number;
  height: number;
}

export const LAUNCH_ILLUSTRATION: LaunchIllustration | null = {
  src: "/images/launch/gemini-illust-001.webp",
  width: 2068,
  height: 499,
};

/**
 * 휴대폰(≤480) 자르기 비율(가로 ÷ 세로). 원래 비율이면 390 폭에서 높이 약 90px 이라 얼굴이 안
 * 보인다 → 가운데 인물을 중심으로 더 높게 자른다(object-fit: cover · 가운데 기준).
 * 2:1(390 폭에서 350×175) — 가운데 인물(원본 가로 37~63%)이 온전히 들어가고 양옆 인물은 반쯤
 * 걸린다. 대표 눈검사로 확정(2026-10-18 · 원장 D-54 · 3:2 와 비교).
 */
export const LAUNCH_ILLUSTRATION_MOBILE_ASPECT = 2;
