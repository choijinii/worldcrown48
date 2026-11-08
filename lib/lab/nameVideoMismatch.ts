/**
 * 이름↔영상 불일치 판정 (IMAGE-1 PR 1 · 마티오 메모 → D-77 보충).
 *
 * 영상 제목·채널(검수·소싱 때 받은 값 — 초안 칸 videoTitle · videoChannel)에 엔트리 이름(한글) ·
 * 영어 이름 · 소속(그룹) 중 하나도 없으면 "다를 수 있다"고 본다. 판정은 **의심 표시**일 뿐이다 —
 * 발행을 막지 않고, 배지와 확인창이 운영자의 눈을 그 칸으로 보낸다.
 *
 * 비교는 소문자 + 공백 제거. 영상이 없거나 제목·채널 재료가 없는 칸은 판정하지 않는다(재료 없이
 * 배지를 띄우면 옛 칸 전부가 주황이 된다).
 */
import { isValidVideoId } from "@/lib/embed/youtubeUrl";

const norm = (s: string | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, "");

export function nameVideoMismatch(
  entry: { name: string; nameEn?: string; affiliation?: string },
  video: { title?: string; channel?: string } | null,
): boolean {
  if (!video) return false;
  const hay = norm(video.title) + "\u0000" + norm(video.channel);
  if (hay === "\u0000") return false;
  const needles = [entry.name, entry.nameEn, entry.affiliation].map(norm).filter((n) => n.length > 0);
  if (needles.length === 0) return false;
  return !needles.some((n) => hay.includes(n));
}

/** 영상 칸 중 불일치 칸 번호(0부터). 확인창 경고 줄과 칸 배지가 같은 목록을 쓴다. */
export function mismatchSlots(
  slots: readonly {
    name: string;
    affiliation?: string;
    nameEn?: string;
    videoId?: string;
    videoTitle?: string;
    videoChannel?: string;
  }[],
): number[] {
  return slots.flatMap((s, i) =>
    isValidVideoId(s.videoId ?? "") &&
    nameVideoMismatch(s, { title: s.videoTitle, channel: s.videoChannel })
      ? [i]
      : [],
  );
}

/** 발행 확인창의 [발행하기] — 체크 3칸이 다 켜졌을 때만. */
export const PUBLISH_CONFIRM_CHECKS = 3;
export function publishConfirmReady(checks: readonly boolean[]): boolean {
  return checks.length === PUBLISH_CONFIRM_CHECKS && checks.every(Boolean);
}
