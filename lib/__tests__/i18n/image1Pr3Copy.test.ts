/**
 * IMAGE-1 PR 3 — 화면 문구가 지시서 2-D 승인표(2026-11-16 00:01 대표 "승인!")와 글자까지 같다.
 * 아래 TABLE 은 승인표를 그대로 옮긴 것이다(outputs/prompts/PROMPT_ClaudeCode_IMAGE-1_PR3_v1.0_2026-11-16.md 2-D).
 * 자리 표시({n} · {대회 제목} · {title} …)도 승인표 글자 그대로 사전에 들어 있다.
 */
import { describe, expect, it } from "vitest";
import { MESSAGES, resolveMessage, type MessageKey } from "@/lib/i18n/messages";

type Row = [n: string, key: MessageKey, ko: string, en: string, es: string];

const TABLE: Row[] = [
  // 가. 그림 확인 창
  ["1", "lab.imageCheck.title", "슬롯 {n} · 그림 확인", "Slot {n} · check the image", "Espacio {n} · revisar la imagen"],
  ["2", "lab.imageCheck.hint", "출처 페이지에서 엔트리가 맞는지 확인하세요.", "Check on the source page that this is the right entry.", "Comprueba en la página de origen que es la entrada correcta."],
  ["3", "lab.imageCheck.openPage", "출처 페이지 열기 ↗", "Open source page ↗", "Abrir página de origen ↗"],
  ["4", "lab.imageCheck.openOriginal", "원본 그림 열기 ↗", "Open original image ↗", "Abrir imagen original ↗"],
  ["5", "lab.imageCheck.open", "그림 확인 창 열기", "Open image check", "Abrir revisión de imagen"],
  // 나. 내리기 — 이미지 대회
  ["6", "lab.takedown.image.button", "그림 내리기", "Take down images", "Retirar imágenes"],
  ["7", "lab.takedown.image.title", "그림 내리기 · {대회 제목}", "Take down images · {title}", "Retirar imágenes · {title}"],
  ["8", "lab.takedown.image.note", "내릴 엔트리를 고르세요. 1분 안에 매치 무대 · 피치 표지 · 차트 · 크라운 카드에서 그림이 사라지고 이름 첫 글자만 남습니다. 되돌릴 수 없어요.", "Choose the entry to take down. Within a minute its image disappears from the match stage, the Pitch cover, the chart and Crown Cards, leaving only the initial. This can't be undone.", "Elige la entrada que quieres retirar. En un minuto su imagen desaparece del escenario, la portada de The Pitch, el chart y las Crown Cards, y solo queda la inicial. No se puede deshacer."],
  ["9", "lab.takedown.row", "내리기", "Take down", "Retirar"],
  ["10", "lab.takedown.reasonPlaceholder", "사유 (예: 소속사 요청 · policy@ 11/27 접수)", "Reason (e.g. agency request · received at policy@ on Nov 27)", "Motivo (p. ej., solicitud de la agencia · recibida en policy@ el 27 nov)"],
  ["11", "lab.takedown.reasonRequired", "간단하게 사유를 적어 주세요.", "Please enter a brief reason.", "Escribe un motivo breve."],
  ["12", "lab.takedown.image.confirm", "‘{이름}’의 그림을 내릴까요? 되돌릴 수 없어요.", "Take down the image of “{name}”? This can't be undone.", "¿Retirar la imagen de «{name}»? No se puede deshacer."],
  ["13", "lab.takedown.image.run", "그림 내리기", "Take down image", "Retirar imagen"],
  ["14", "lab.takedown.image.done", "✓ ‘{이름}’의 그림을 내렸어요 · 크라운 카드 {n}장을 다시 굽고 있어요", "✓ Took down the image of “{name}” · re-rendering {n} Crown Cards", "✓ Imagen de «{name}» retirada · regenerando {n} Crown Cards"],
  ["15", "lab.takedown.rowDone", "내림 · {날짜} · {사유}", "Taken down · {date} · {reason}", "Retirada · {date} · {reason}"],
  ["16", "lab.takedown.image.fail", "그림을 내리지 못했어요. 다시 시도해 주세요.", "Couldn't take the image down. Please try again.", "No se pudo retirar la imagen. Inténtalo de nuevo."],
  ["17", "lab.takedown.image.empty", "이 대회에는 내릴 그림이 없어요.", "This tournament has no images to take down.", "Este torneo no tiene imágenes que retirar."],
  // 나-2. 내리기 — 영상 대회
  ["6영", "lab.takedown.video.button", "영상 내리기", "Take down videos", "Retirar videos"],
  ["7영", "lab.takedown.video.title", "영상 내리기 · {대회 제목}", "Take down videos · {title}", "Retirar videos · {title}"],
  ["8영", "lab.takedown.video.note", "내릴 엔트리를 고르세요. 1분 안에 매치 무대의 영상과 피치 표지 · 차트 · 크라운 카드의 썸네일이 사라지고 이름 첫 글자만 남습니다. 되돌릴 수 없어요.", "Choose the entry to take down. Within a minute its video disappears from the match stage and its thumbnail from the Pitch cover, the chart and Crown Cards, leaving only the initial. This can't be undone.", "Elige la entrada que quieres retirar. En un minuto su video desaparece del escenario y su miniatura de la portada de The Pitch, el chart y las Crown Cards, y solo queda la inicial. No se puede deshacer."],
  ["12영", "lab.takedown.video.confirm", "‘{이름}’의 영상을 내릴까요? 되돌릴 수 없어요.", "Take down the video of “{name}”? This can't be undone.", "¿Retirar el video de «{name}»? No se puede deshacer."],
  ["13영", "lab.takedown.video.run", "영상 내리기", "Take down video", "Retirar video"],
  ["14영", "lab.takedown.video.done", "✓ ‘{이름}’의 영상을 내렸어요 · 크라운 카드 {n}장을 다시 굽고 있어요", "✓ Took down the video of “{name}” · re-rendering {n} Crown Cards", "✓ Video de «{name}» retirado · regenerando {n} Crown Cards"],
  ["16영", "lab.takedown.video.fail", "영상을 내리지 못했어요. 다시 시도해 주세요.", "Couldn't take the video down. Please try again.", "No se pudo retirar el video. Inténtalo de nuevo."],
  ["17영", "lab.takedown.video.empty", "이 대회에는 내릴 영상이 없어요.", "This tournament has no videos to take down.", "Este torneo no tiene videos que retirar."],
];

describe("IMAGE-1 PR 3 문구 = 승인표", () => {
  it("25줄(가 5 · 나 12 · 나-2 8)", () => {
    expect(TABLE).toHaveLength(25);
  });
  for (const [n, key, ko, en, es] of TABLE) {
    it(`${n}번 — 3언어 글자까지 같다`, () => {
      expect(MESSAGES[key]).toEqual({ ko, en, es });
    });
  }
  it("자리 표시에 값이 들어간다", () => {
    const p = { "대회 제목": "T", title: "T", 이름: "카리나", name: "Karina", n: 3, 날짜: "2026-11-27", date: "2026-11-27", 사유: "r", reason: "r" };
    expect(resolveMessage("ko", "lab.takedown.image.title", p)).toBe("그림 내리기 · T");
    expect(resolveMessage("es", "lab.takedown.video.done", p)).toBe("✓ Video de «Karina» retirado · regenerando 3 Crown Cards");
    expect(resolveMessage("ko", "lab.takedown.rowDone", p)).toBe("내림 · 2026-11-27 · r");
  });
});
