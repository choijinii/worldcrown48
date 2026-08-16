/**
 * timestamps — 사람이 쓴 시간 표기와 API가 준 시간 표기를 모두 초로 (LAB-EV-1 W2).
 *
 *   댓글 "1:23 여기가 킬링파트"  → 83
 *   챕터 "0:00 Intro"           → 0
 *   contentDetails.duration     → "PT3M52S" → 232
 *
 * 느슨하게 줍되(extractTimestamps) 엄격하게 검사한다(parseTimestamp): 댓글에는
 * 전화번호·연도·가격이 섞여 들어오므로, 분·초가 60을 넘는 표기는 시간이 아니라
 * 오타로 본다.
 */

/** m:ss (분은 두 자리까지, 초는 0~59). */
const MMSS_RE = /^(\d{1,2}):([0-5]\d)$/;
/** h:mm:ss. */
const HHMMSS_RE = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/;
/** 문장 속 타임스탬프 — 앞뒤가 숫자면 줍지 않는다(전화번호·ID 방어). */
const IN_TEXT_RE = /(?<!\d)(\d{1,3}):([0-5]\d)(?::([0-5]\d))?(?!\d)/g;
const ISO_DURATION_RE = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

/** "1:23" · "1:02:03" → 초. 시간 표기가 아니면 null. */
export function parseTimestamp(raw: string): number | null {
  const value = raw.trim();
  const hms = value.match(HHMMSS_RE);
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3]);
  const ms = value.match(MMSS_RE);
  if (ms) return Number(ms[1]) * 60 + Number(ms[2]);
  return null;
}

/** 댓글 한 개에서 타임스탬프를 초로 채굴한다. 같은 시각의 반복은 한 번만. */
export function extractTimestamps(text: string): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  IN_TEXT_RE.lastIndex = 0; // 모듈 레벨 /g 정규식은 상태를 남긴다
  let m: RegExpExecArray | null;
  while ((m = IN_TEXT_RE.exec(text)) !== null) {
    const sec =
      m[3] === undefined
        ? Number(m[1]) * 60 + Number(m[2])
        : Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    if (!seen.has(sec)) {
      seen.add(sec);
      out.push(sec);
    }
  }
  return out;
}

/** ISO-8601 duration("PT3M52S") → 초. 해석 불가(라이브 등)면 null. */
export function parseIso8601Duration(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const m = raw.match(ISO_DURATION_RE);
  if (!m) return null;
  return (
    Number(m[1] ?? 0) * 86400 +
    Number(m[2] ?? 0) * 3600 +
    Number(m[3] ?? 0) * 60 +
    Number(m[4] ?? 0)
  );
}
