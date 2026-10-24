/**
 * nameSoundsAlike — 영어 이름이 한글 이름과 같은 소리인가 (NAME-I18N-1 PR 2 · 대표 2026-10-24 A안).
 *
 * 백필 dry-run 에서 AI 가 **다른 엔트리의 이름을 확신 있게** 넣은 사례가 7건 나왔다
 * (설윤 → Yeji · 화란 → Huh Yunjin …). 응답은 번호(i)로 맞추므로 순서 섞임은 막지만, 모델이
 * 이름을 한 칸 밀려 기억하는 것은 못 막는다. 그래서 받은 영어 이름을 한글 발음과 대 본다 —
 * 맞지 않으면 translateContestantNamesCore 가 그 칸을 비우고(화면은 한글) 먼저 볼 이름으로 올린다.
 *
 * 판정은 **자음 뼈대 비교**다. 모음은 로마자 표기마다 흔들리므로(Sullyoon · Seol-yun) 버리고,
 * 자음을 소리 갈래(K·N·T·L·M·P·S·J·H·NG)로 바꿔 이웃한 같은 갈래는 하나로 줄인 뒤 같은지 본다.
 * 한글 쪽은 갈래가 둘일 수 있는 자음(ㅈ = J·S, ㅎ = H·묵음, 성 "이" = 묵음·L)마다 경우를 다 만들고,
 * 영어 쪽도 ng(NG·N K) · 연음 g(K·J) · 끝소리 r(L·묵음)을 다 만든다. 하나라도 같으면 같은 사람이다.
 *
 * 세 글자 한글 이름은 성을 빼거나(Yunjin) 뒤로 보낸(Yunjin Huh) 표기도 받는다. 이름 칸에 이미
 * 로마자가 있으면(윈터 (Winter)) 그것과 같으면 통과. 발음과 다른 공식 이름은 KNOWN_OFFICIAL 에 둔다.
 *
 * 목표는 "다른 사람 이름"을 잡는 것이지 철자 검사가 아니다 — 뼈대가 같은 다른 사람(민지·민주)은
 * 못 잡는다. 대표 검수를 마친 실제 이름 128쌍을 잘못 올리지 않는 것을 시험으로 고정했다.
 */

/** 한글 발음과 다른 공식 영어 이름 — 한글(띄어쓰기 없이) → 로마자(소문자·글자만). */
export const KNOWN_OFFICIAL: Record<string, string> = {
  아이유: "iu",
  뉴진스: "newjeans",
  에스파: "aespa",
};

type Cls = "K" | "N" | "T" | "L" | "M" | "P" | "S" | "J" | "H" | "NG" | "";

// 초성 19개 (가 = 0xAC00 기준 순서)
const INITIAL: Cls[][] = [
  ["K"], ["K"], ["N"], ["T"], ["T"], ["L"], ["M"], ["P"], ["P"], ["S"],
  ["S"], [""], ["J", "S"], ["J"], ["J"], ["K"], ["T"], ["P"], ["H", ""],
];
// 종성 28개 (0 = 없음)
const FINAL: Cls[] = [
  "", "K", "K", "K", "N", "N", "N", "T", "L", "L", "M", "L", "L", "L",
  "P", "L", "M", "P", "P", "T", "T", "NG", "T", "T", "K", "T", "P", "T",
];

function latin(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function letters(s: string): string {
  return latin(s).replace(/[^a-z0-9]/g, "");
}

/** 경우의 수 곱 — 각 자리의 갈래 중 하나씩. */
function product(slots: Cls[][]): Cls[][] {
  let out: Cls[][] = [[]];
  for (const opts of slots) out = out.flatMap((pre) => opts.map((o) => [...pre, o]));
  return out;
}

function key(seq: Cls[]): string {
  const out: string[] = [];
  for (const c of seq) if (c && out[out.length - 1] !== c) out.push(c);
  return out.join(" ");
}

function syllableSlots(syl: string, first: boolean): Cls[][] {
  const code = syl.charCodeAt(0) - 0xac00;
  const l = Math.floor(code / 588);
  const t = code % 28;
  const init = first && syl === "이" ? (["", "L"] as Cls[]) : INITIAL[l];
  return [init, [FINAL[t]]];
}

function hangulKeys(syllables: string[]): Set<string> {
  const orders = [syllables];
  if (syllables.length === 3) {
    orders.push(syllables.slice(1)); // 성을 뺀 표기
    orders.push([...syllables.slice(1), syllables[0]]); // 성을 뒤로 보낸 표기
  }
  const keys = new Set<string>();
  for (const order of orders) {
    const slots = order.flatMap((s, idx) => syllableSlots(s, order === orders[0] ? idx === 0 : s === syllables[0]));
    for (const seq of product(slots)) keys.add(key(seq));
  }
  return keys;
}

const VOWEL = /[aeiouyw]/;

function englishKeys(word: string): Set<string> {
  const s = word.replace(/[^a-z]/g, "");
  const slots: Cls[][][] = []; // 자리마다 갈래 목록(갈래 하나가 자음 여러 개일 수 있다)
  for (let i = 0; i < s.length; ) {
    const ch = s[i];
    const two = s.slice(i, i + 2);
    const next = s[i + 1] ?? "";
    if (VOWEL.test(ch)) {
      i += 1;
      continue;
    }
    if (two === "ch" || two === "ts" || two === "tz" || two === "dz") slots.push([["J"]]);
    else if (two === "sh") slots.push([["S"]]);
    else if (two === "ph") slots.push([["P"]]);
    else if (two === "th") slots.push([["T"]]);
    else if (two === "kh" || two === "gh" || two === "ck") slots.push([["K"]]);
    else if (two === "ng") slots.push([["NG"], ["N", "K"]]);
    else {
      i += 1;
      if (ch === "c") slots.push([[/[eiy]/.test(next) ? "S" : "K"]]);
      else if (ch === "g") slots.push(/[ei]/.test(next) ? [["K"], ["J"]] : [["K"]]);
      else if (ch === "r") slots.push(VOWEL.test(next) ? [["L"]] : [["L"], [""]]);
      else if (ch === "x") slots.push([["K", "S"]]);
      else {
        const one: Record<string, Cls> = {
          b: "P", p: "P", f: "P", v: "P", d: "T", t: "T", j: "J", k: "K", q: "K",
          l: "L", m: "M", n: "N", s: "S", z: "J", h: "H",
        };
        slots.push([[one[ch] ?? ""]]);
      }
      continue;
    }
    i += 2;
  }
  let seqs: Cls[][] = [[]];
  for (const opts of slots) seqs = seqs.flatMap((pre) => opts.map((o) => [...pre, ...o]));
  return new Set(seqs.map(key));
}

export function nameSoundsAlike(ko: string, en: string): boolean {
  const target = letters(en);
  if (!target) return false;

  // 이름 칸에 이미 들어 있는 로마자 — "윈터 (Winter)" · "Kai (카이) – EXO-K"
  const tokens: string[] = latin(ko).match(/[a-z0-9]+/g) ?? [];
  if (tokens.includes(target) || (tokens.length > 0 && tokens.join("") === target)) return true;

  const syllables: string[] = ko.match(/[가-힣]/g) ?? [];
  if (syllables.length === 0) return false;
  if (KNOWN_OFFICIAL[syllables.join("")] === target) return true;

  const want = englishKeys(latin(en));
  for (const k of hangulKeys(syllables)) if (want.has(k)) return true;
  return false;
}
