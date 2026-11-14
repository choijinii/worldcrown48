/**
 * IMAGE-1 PR 2 — 화면 문구 14줄이 대표 승인표(2026-11-14 16:29 "승인!")와 글자까지 같다.
 * 표는 지시서 §2-D 를 그대로 옮긴 것이다. 자리표시자 이름은 세 언어 모두 영어({reason} 등)로 둔다 —
 * 화면에 보이는 글자는 승인표와 같다(12번 ko 의 "{이유}" 자리에 이유 문구가 들어간다).
 */
import { describe, expect, it } from "vitest";
import { resolveMessage, type MessageKey } from "@/lib/i18n/messages";

type Row = [number, MessageKey, string, string, string, Record<string, string | number>?];

const V3 = { done: 3, total: 48 };
const V4 = { filled: 48, found: 47, todo: 1 };
const V12 = { n: 2, reason: "R" };

const TABLE: Row[] = [
  [1, "lab.generate.imagesSub", "AI가 엔트리 48개를 채우고 → 이미지를 찾고 → 검수까지 이어서 합니다", "AI fills all 48 → finds images → inspects them", "La IA rellena los 48 → busca imágenes → los inspecciona"],
  [2, "lab.fill.blanksImage", "빈칸 채우고 이미지까지", "Fill blanks + find images", "Rellenar vacíos + buscar imágenes"],
  [3, "lab.generate.imageSourcing", "이미지 찾는 중… 3/48", "Finding images… 3/48", "Buscando imágenes… 3/48", V3],
  [4, "lab.generate.imagesDone", "✓ 48칸을 채우고 그림 47장을 넣었어요 · 손볼 칸 1개", "✓ Filled 48 slots and added 47 images · 1 need a look", "✓ 48 casillas rellenadas y 47 imágenes añadidas · 1 por revisar", V4],
  [5, "lab.image.refresh", "새 이미지 찾기", "Find another image", "Buscar otra imagen"],
  [6, "lab.image.notFound", "세로 400px 이상인 그림을 찾지 못했어요", "No image 400 px tall or more was found", "No se encontró ninguna imagen de 400 px de alto o más"],
  [7, "lab.image.findOnly", "이미지만 찾기", "Find images only", "Buscar solo imágenes"],
  [8, "lab.image.findOnlyHint", "이름은 그대로 두고, 그림이 없는 칸만 찾아요", "Keeps the names and searches only slots without an image", "Mantiene los nombres y busca solo en las casillas sin imagen"],
  [9, "lab.image.pasteLinks", "이미지 주소 한꺼번에 넣기", "Paste image links", "Pegar enlaces de imagen"],
  [10, "lab.image.pasteHint", "한 줄에 주소 하나씩, 칸 순서대로 붙여 넣으세요(최대 48줄). 그림이 없는 칸부터 채워요.", "One link per line, in slot order (up to 48). Slots without an image are filled first.", "Un enlace por línea, en el orden de las casillas (máx. 48). Primero se rellenan las casillas sin imagen."],
  [11, "lab.image.pasteSubmit", "칸에 넣기", "Add to slots", "Añadir a las casillas"],
  [12, "lab.image.pasteLineFail", "2번째 줄: R", "Line 2: R", "Línea 2: R", V12],
  [13, "lab.image.noKey", "이미지 검색 키가 없어 그림을 넣지 못해요.", "No image search key, so images can't be added.", "No hay clave de búsqueda de imágenes, así que no se pueden añadir imágenes."],
  [14, "lab.image.limit", "이미지 검색 한도입니다. 남은 칸은 수동으로 넣어 주세요.", "Image search limit reached. Please add the rest manually.", "Se alcanzó el límite de búsqueda de imágenes. Añade el resto manualmente."],
];

describe("IMAGE-1 PR 2 문구 14줄 = 승인표(§2-D)", () => {
  for (const [n, key, ko, en, es, vars] of TABLE) {
    it(`${n}번 ${key}`, () => {
      expect(resolveMessage("ko", key, vars)).toBe(ko);
      expect(resolveMessage("en", key, vars)).toBe(en);
      expect(resolveMessage("es", key, vars)).toBe(es);
    });
  }
  it("영상 대회 문구는 그대로", () => {
    expect(resolveMessage("ko", "lab.fill.blanks")).toBe("빈칸 채우고 영상까지");
    expect(resolveMessage("ko", "lab.generate.sourcing", V3)).toBe("영상 찾는 중… 3/48");
  });
});
