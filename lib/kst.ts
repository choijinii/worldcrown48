/**
 * KST (UTC+9) date helper.
 *
 * Handoff §9 trap 4: `new Date().toISOString().slice(0,10)` is UTC-based and
 * skews the daily vote count by ±1 day around 09:00 KST. We pin the date
 * format to Asia/Seoul via Intl so the daily-5-vote window resets at the
 * Korean midnight regardless of where the runtime clock thinks it is.
 *
 * 'en-CA' returns 'YYYY-MM-DD' as a side-effect of its date conventions —
 * the same string we store in Firestore `votes.date`.
 */
const kstFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getTodayKST(): string {
  return kstFormatter.format(new Date());
}
