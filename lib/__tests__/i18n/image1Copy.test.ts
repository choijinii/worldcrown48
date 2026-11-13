/**
 * IMAGE-1 PR 1 — 화면 문구 33줄이 지시서 6절 승인표(2026-11-08 14:45 대표 승인)와 글자까지 같다.
 *
 * 아래 TABLE 은 승인표를 **그대로 옮긴 것**이다(outputs/PROMPT_ClaudeCode_IMAGE-1_PR1_v1.0_2026-11-06.md 6절).
 * 한 줄에 두 부품이 들어 있는 줄(30 버튼 2개 · 32 배지 이름·설명)은 사전에서 둘로 나눠 두고, 여기서
 * 승인표의 구분자(" · " · " — ")로 다시 이어 붙여 같은지 본다. 5번의 "(배지)"는 쓰임 표시라 글자가 아니다.
 */
import { describe, expect, it } from "vitest";
import { resolveMessage, type MessageKey } from "@/lib/i18n/messages";

type Row = [n: number, keys: MessageKey[], sep: string, ko: string, en: string, es: string];

const TABLE: Row[] = [
  [1, ["lab.image.addFiles"], "", "이미지 파일 넣기", "Add image files", "Añadir archivos de imagen"],
  // 2·3번은 LAB-FIX-3 승인표 v3(2026-11-13)로 바뀌었고, 4번 [그림 지우기]는 삭제됐다(원장 D-89).
  // 지금 글자 시험은 lib/__tests__/i18n/labFix3Copy.test.ts 가 갖는다.
  [5, ["lab.image.badge"], "", "그림", "Image", "Imagen"],
  [6, ["lab.manual.button"], "", "만들기 매뉴얼", "Creation Manual", "Manual de creación"],
  [7, ["lab.image.fail.fetchFailed"], "", "주소에서 그림을 받지 못했어요", "Couldn't fetch an image from that address", "No se pudo obtener la imagen de esa dirección"],
  [8, ["lab.image.fail.notImage"], "", "그림 파일이 아니에요", "That isn't an image file", "No es un archivo de imagen"],
  [9, ["lab.image.fail.tooLarge"], "", "10MB를 넘어요", "Larger than 10 MB", "Supera los 10 MB"],
  [10, ["lab.image.fail.tooSmall"], "", "세로 400px보다 작아요", "Shorter than 400 px", "Menos de 400 px de alto"],
  [11, ["lab.manual.title"], "", "대회 만들기 — 이렇게 진행하세요", "Creating a tournament — step by step", "Crear un torneo — paso a paso"],
  [12, ["lab.manual.step1"], "", "대회 정하기 — 제목·설명·카테고리·마감일, 엔트리 단위(개인/팀)", "Set up the tournament — title, description, category, deadline, entry unit (solo/team)", "Define el torneo — título, descripción, categoría, fecha límite, unidad de entrada (individual/equipo)"],
  [13, ["lab.manual.step2"], "", "엔트리 48개 채우기 — [동영상 생성] 또는 [이미지 생성]으로 한 번에, 또는 칸마다 직접", "Fill 48 entries — all at once with [Generate videos] or [Generate images], or slot by slot", "Completa 48 entradas — de una vez con [Generar videos] o [Generar imágenes], o casilla por casilla"],
  [14, ["lab.manual.step3"], "", "칸마다 확인하기 — 아래 \"꼭 지킬 것\"을 보며 배지가 뜬 칸부터 고칩니다", "Check every slot — start with flagged slots, using \"Must-dos\" below", "Revisa cada casilla — empieza por las marcadas, siguiendo \"Imprescindibles\""],
  [15, ["lab.manual.step4"], "", "대표 매치 고르기 — 대회 표지에 나란히 보일 엔트리 A·B", "Pick the cover match — entries A and B shown on the cover", "Elige el enfrentamiento de portada — entradas A y B"],
  [16, ["lab.manual.step5"], "", "[토너먼트 생성] — 마지막 확인창의 세 칸을 체크하면 발행됩니다", "[Create tournament] — tick the three boxes in the final check to publish", "[Crear torneo] — marca las tres casillas de la comprobación final para publicar"],
  [17, ["lab.manual.mustTitle"], "", "꼭 지킬 것", "Must-dos", "Imprescindibles"],
  [18, ["lab.manual.must1"], "", "엔트리와 영상·그림이 같은지 — 썸네일 속 엔트리가 그 칸의 이름과 맞는지", "Entry matches its video/image — the thumbnail shows the entry named in that slot", "La entrada coincide con su video/imagen — la miniatura muestra la entrada nombrada"],
  [19, ["lab.manual.must2"], "", "영상 제목·채널에 엔트리 이름이나 그룹 이름이 있는지. 공식 채널이면 더 좋습니다", "Video title or channel includes the entry or group name — official channels are best", "El título o canal del video incluye el nombre de la entrada o del grupo — mejor si es oficial"],
  [20, ["lab.manual.must3"], "", "경고 배지가 남은 칸이 없는지 — 불일치·중복 의심·실존 의심·수동 필요", "No warning badges left — mismatch, possible duplicate, unverified, needs manual check", "Sin insignias de aviso — discrepancia, posible duplicado, sin verificar, revisión manual"],
  [21, ["lab.manual.must4"], "", "같은 엔트리를 두 번 넣지 않기", "Never add the same entry twice", "No añadas la misma entrada dos veces"],
  [22, ["lab.manual.must5"], "", "대표 매치 A·B 영상은 끝까지 보고 고르기 — 가장 많이 보이는 칸입니다", "Watch cover match videos A and B to the end — they're seen the most", "Mira los videos A y B de portada hasta el final — son los más vistos"],
  [23, ["lab.manual.must6"], "", "팀 대회는 멤버 한 사람 직캠이 아니라 팀 무대 영상으로", "Team tournaments use full-team stage videos, not single-member fancams", "En torneos de equipo usa videos del escenario completo, no fancams de un miembro"],
  [24, ["lab.manual.must7"], "", "커뮤니티 규칙 — 혐오·차별, 성적인 내용, 미성년자를 성적으로 다루는 내용은 만들 수 없습니다. 당사자나 대리인이 요청하면 그림·영상이 내려질 수 있습니다", "Community rules — no hate, discrimination, sexual content, or sexualization of minors. Images and videos may be taken down at the request of the person or their representative", "Normas de la comunidad — sin odio, discriminación, contenido sexual ni sexualización de menores. Las imágenes y videos pueden retirarse a petición del interesado o su representante"],
  [25, ["lab.confirm.title"], "", "발행 전 마지막 확인", "Final check before publishing", "Comprobación final antes de publicar"],
  [26, ["lab.confirm.warn"], "", "이름과 영상이 다를 수 있는 칸 {n}개 — {번호} (눌러서 이동)", "{n} slots where name and video may not match — {numbers} (tap to go)", "{n} casillas donde nombre y video podrían no coincidir — {números} (toca para ir)"],
  [27, ["lab.confirm.check1"], "", "48칸 썸네일이 각 칸의 엔트리와 맞는지 확인했다", "I checked that all 48 thumbnails match their entries", "Comprobé que las 48 miniaturas coinciden con sus entradas"],
  [28, ["lab.confirm.check2"], "", "대표 매치 A·B 영상을 끝까지 확인했다", "I watched cover match videos A and B to the end", "Vi los videos A y B de portada hasta el final"],
  [29, ["lab.confirm.check3"], "", "경고 배지가 남은 칸이 없다", "No warning badges remain", "No quedan insignias de aviso"],
  [30, ["lab.confirm.back", "lab.confirm.publish"], " · ", "돌아가서 고치기 · 발행하기", "Go back and fix · Publish", "Volver y corregir · Publicar"],
  [31, ["lab.confirm.manualAgain"], "", "만들기 매뉴얼 다시 보기", "View the creation manual again", "Ver de nuevo el manual de creación"],
  [32, ["lab.badge.nameVideo", "lab.badge.nameVideoDesc"], " — ", "이름↔영상 불일치 — 영상 제목·채널에 이 엔트리 이름이 없어요", "Name ≠ video — the entry name isn't in the video title or channel", "Nombre ≠ video — el nombre de la entrada no está en el título ni el canal"],
  [33, ["arena.stage.source"], "", "출처: {도메인}", "Source: {domain}", "Fuente: {dominio}"],
];

describe("IMAGE-1 문구 33줄 = 승인표", () => {
  it("33줄 전부 있다(2·3·4번은 LAB-FIX-3 로 옮김)", () => {
    expect(TABLE.map((r) => r[0])).toEqual(Array.from({ length: 33 }, (_, i) => i + 1).filter((n) => n < 2 || n > 4));
  });
  for (const [n, keys, sep, ko, en, es] of TABLE) {
    it(`${n}번 — 3언어 글자까지 같다`, () => {
      const join = (lang: "ko" | "en" | "es") => keys.map((k) => resolveMessage(lang, k)).join(sep);
      expect(join("ko")).toBe(ko);
      expect(join("en")).toBe(en);
      expect(join("es")).toBe(es);
    });
  }
  it("한국어·스페인어 자리 표시도 값이 들어간다", () => {
    expect(resolveMessage("ko", "arena.stage.source", { 도메인: "a.com" })).toBe("출처: a.com");
    expect(resolveMessage("es", "lab.confirm.warn", { n: 2, números: "3, 9" })).toBe(
      "2 casillas donde nombre y video podrían no coincidir — 3, 9 (toca para ir)",
    );
  });
});
