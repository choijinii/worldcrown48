/**
 * POLICY-YT-1 부록 A — YouTube API 서비스 문장 (대표 승인 2026-10-10 15:47).
 *
 * YouTube API 개발자 정책 III.A: 약관에 YouTube 서비스 약관 링크 + "구속된다" 문장(A-2),
 * 개인정보처리방침에 YouTube API 사용 고지 · Google 개인정보처리방침 링크 · 다루는 정보 ·
 * 30일 보관 · 문의처(A-1). 할당량 감사가 정책 문서를 증거로 본다 — 글자가 바뀌면 승인본이 아니다.
 *
 * 자리: A-1 = 개인정보처리방침 §5 의 마지막(`---` 바로 앞) · A-2 = 이용약관 §1 목록의 마지막 줄.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");
const read = (lang: string, doc: string) =>
  readFileSync(path.join(ROOT, "content", lang, `${doc}.md`), "utf8");

/** 부록 A-1 — 승인본 그대로. */
const PRIVACY_BLOCK = {
  ko: `### YouTube API 서비스

월크48은 Match 화면에서 영상을 보여 주고 Tournament에 쓸 영상을 찾기 위해 **YouTube API 서비스**를 사용합니다.

- 월크48이 YouTube에서 받는 정보는 영상 ID·제목·채널 이름·재생 가능 여부 같은 **공개 영상 정보**뿐입니다. 사용자의 YouTube 계정이나 개인 정보에는 접근하지 않습니다.
- 영상은 YouTube의 개인정보 보호 강화 모드(youtube-nocookie.com)로 재생됩니다. 재생할 때 Google이 처리하는 정보는 [Google 개인정보처리방침](https://policies.google.com/privacy)을 따릅니다.
- YouTube에서 받은 영상 정보는 30일을 넘겨 보관하지 않으며, 그 전에 YouTube에서 새로 받거나 지웁니다.
- YouTube 관련 문의·삭제 요청은 [policy@worldcrown48.com](mailto:policy@worldcrown48.com)으로 보내 주세요.`,
  en: `### YouTube API Services

WC48 uses **YouTube API Services** to show videos on the Match screen and to find videos for Tournaments.

- The only information WC48 receives from YouTube is **public video information** such as video ID, title, channel name, and playability. We do not access your YouTube account or personal information.
- Videos play in YouTube's privacy-enhanced mode (youtube-nocookie.com). Information Google processes during playback is governed by the [Google Privacy Policy](https://policies.google.com/privacy).
- We do not keep video information received from YouTube for more than 30 days; before then we refresh it from YouTube or delete it.
- Send YouTube-related questions or deletion requests to [policy@worldcrown48.com](mailto:policy@worldcrown48.com).`,
  es: `### Servicios de la API de YouTube

WC48 utiliza los **Servicios de la API de YouTube** para mostrar videos en la pantalla de Match y para encontrar videos para los Tournaments.

- La única información que WC48 recibe de YouTube es **información pública de los videos**, como el ID, el título, el nombre del canal y si se puede reproducir. No accedemos a su cuenta de YouTube ni a su información personal.
- Los videos se reproducen en el modo de privacidad mejorada de YouTube (youtube-nocookie.com). La información que Google trata durante la reproducción se rige por la [Política de Privacidad de Google](https://policies.google.com/privacy).
- No conservamos la información de los videos recibida de YouTube durante más de 30 días; antes de ese plazo la actualizamos desde YouTube o la eliminamos.
- Envíe sus consultas o solicitudes de eliminación relacionadas con YouTube a [policy@worldcrown48.com](mailto:policy@worldcrown48.com).`,
} as const;

/** 부록 A-2 — 승인본 그대로. */
const TERMS_LINE = {
  ko: "- 월크48은 YouTube API 서비스를 사용합니다. 월크48을 이용하면 [YouTube 서비스 약관](https://www.youtube.com/t/terms)에도 동의하는 것으로 봅니다.",
  en: "- WC48 uses YouTube API Services. By using WC48, you also agree to be bound by the [YouTube Terms of Service](https://www.youtube.com/t/terms).",
  es: "- WC48 utiliza los Servicios de la API de YouTube. Al usar WC48, usted también acepta quedar sujeto a los [Términos del Servicio de YouTube](https://www.youtube.com/t/terms).",
} as const;

/** `## N.` 로 시작하는 절 하나의 본문(다음 `## ` 앞까지). */
function section(raw: string, n: number): string {
  const start = raw.search(new RegExp(`^## ${n}\\.`, "m"));
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = raw.slice(start + 1);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
}

for (const lang of ["ko", "en", "es"] as const) {
  describe(`부록 A (${lang})`, () => {
    it("A-1 개인정보처리방침 §5 마지막 = YouTube 소제목 블록, 바로 뒤 ---", () => {
      const body = section(read(lang, "privacy"), 5).trimEnd();
      expect(body.endsWith(`${PRIVACY_BLOCK[lang]}\n\n---`)).toBe(true);
    });

    it("A-2 이용약관 §1 목록의 마지막 줄 = YouTube 약관 문장", () => {
      const bullets = section(read(lang, "terms"), 1)
        .split("\n")
        .filter((l) => l.startsWith("- "));
      expect(bullets.at(-1)).toBe(TERMS_LINE[lang]);
    });

    it("두 문장은 문서마다 한 번뿐", () => {
      expect(read(lang, "privacy").split(PRIVACY_BLOCK[lang]).length - 1).toBe(1);
      expect(read(lang, "terms").split(TERMS_LINE[lang]).length - 1).toBe(1);
    });
  });
}
