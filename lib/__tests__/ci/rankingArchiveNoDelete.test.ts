/**
 * 차트 사진 영구 보관(T5 PR 2 · 대표 2026-11-25) — `ranking_archive` 를 지우는 코드는 어디에도 없다.
 *
 * 글자 "ranking_archive" 만 보면 상수(`ARCHIVE` · 다른 이름의 상수) · 그 상수로 만든 참조 변수를 거쳐
 * 여러 줄 체인으로 지우는 코드를 놓친다(최종 검토 M-1). 그래서 파일마다:
 *   1. 보관 가리킴 = 글자 `ranking_archive` · `rankingArchive` 에서 가져온 `ARCHIVE` ·
 *      `= "ranking_archive"` 로 묶인 이름 · 보관 가리킴이 든 식으로 만든 `const|let` 이름(반복해서 넓힌다).
 *   2. 지우기(`.delete(` · `recursiveDelete` · `deleteDoc(` · `deleteField(`)가 보관 가리킴과 같은 문장
 *      (다음 `;` 까지 — 여러 줄 체인 포함)에 있으면 실패한다.
 * 주석 줄(`//` · ` * `)은 코드가 아니라 건너뛴다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SELF = "lib/__tests__/ci/rankingArchiveNoDelete.test.ts";
const DELETE_RE = /\.delete\s*\(|recursiveDelete|\bdeleteDoc\s*\(|deleteField\s*\(/;
// 시험 이름("…-tournament-delete")은 지우는 코드가 아니다 — 시험은 "남는다"를 확인할 뿐이다.
const ALLOWED_TEXT = ["archive-survives-tournament-delete"];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCommentLine(line: string): boolean {
  return /^\s*(\/\/|\*|\/\*)/.test(line);
}

/** 한 파일 안에서 보관 컬렉션을 가리키는 이름들. */
export function archiveNames(text: string): Set<string> {
  const names = new Set<string>();
  if (/import\s*\{[^}]*\bARCHIVE\b[^}]*\}\s*from\s*["'][^"']*rankingArchive["']/.test(text)) names.add("ARCHIVE");
  for (const m of Array.from(text.matchAll(/\b(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=\s*["']ranking_archive["']/g))) names.add(m[1]);
  // 보관 가리킴이 든 식으로 만든 이름(참조 · 컬렉션 · 문서)을 더 이상 늘지 않을 때까지 넓힌다.
  // 선언은 여러 줄 체인일 수 있어 다음 `;` 까지를 한 식으로 본다.
  for (;;) {
    const before = names.size;
    for (const m of Array.from(text.matchAll(/\b(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=([^;]*);/g))) {
      if (names.has(m[1])) continue;
      if (mentionsArchive(m[2], names)) names.add(m[1]);
    }
    if (names.size === before) break;
  }
  return names;
}

function mentionsArchive(s: string, names: Set<string>): boolean {
  if (s.includes("ranking_archive")) return true;
  for (const n of Array.from(names)) if (new RegExp(`\\b${escapeRe(n)}\\b`).test(s)) return true;
  return false;
}

/**
 * 보관 가리킴와 **같은 문장**(다음 `;` 까지 — 여러 줄 체인 포함)에 든 지우기 — `path:줄번호: 글` 목록.
 * 줄 거리로 보면 옆 문장의 다른 컬렉션 지우기까지 잡아 거짓 경보가 난다.
 */
export function findArchiveDeletes(files: { path: string; text: string }[]): string[] {
  const hits: string[] = [];
  for (const { path, text } of files) {
    const names = archiveNames(text);
    const lines = text.split("\n").map((l) => (isCommentLine(l) ? "" : ALLOWED_TEXT.reduce((a, t) => a.replace(t, ""), l)));
    let stmt: { line: number; text: string }[] = [];
    const flush = () => {
      const joined = stmt.map((x) => x.text).join("\n");
      if (DELETE_RE.test(joined) && mentionsArchive(joined, names)) {
        const at = stmt.find((x) => DELETE_RE.test(x.text)) ?? stmt[0];
        hits.push(`${path}:${at.line}: ${at.text.trim()}`);
      }
      stmt = [];
    };
    lines.forEach((line, i) => {
      const parts = line.split(";");
      parts.forEach((part, j) => {
        stmt.push({ line: i + 1, text: part });
        if (j < parts.length - 1) flush();
      });
    });
    flush();
  }
  return hits;
}

function repoFilesMentioningArchive(): string[] {
  const out = execFileSync(
    "git",
    [
      "grep",
      "-l",
      "-e",
      "ranking_archive",
      "-e",
      "rankingArchive",
      "--",
      ".",
      `:(exclude)${SELF}`,
      ":(exclude)docs",
      ":(exclude)*.md",
    ],
    { encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

describe("검사기 자체 — 심어 둔 지우기를 잡는다", () => {
  it("글자 그대로 지우기", () => {
    const text = `await db.collection("ranking_archive").doc(tid).delete();`;
    expect(findArchiveDeletes([{ path: "x.ts", text }])).toHaveLength(1);
  });

  it("상수 ARCHIVE 로 여러 줄 체인 지우기", () => {
    const text = [
      `import { ARCHIVE, toArchiveDoc } from "./rankingArchive";`,
      `export async function wipe(db, tid) {`,
      `  await db`,
      `    .collection(ARCHIVE)`,
      `    .doc(tid)`,
      `    .delete();`,
      `}`,
    ].join("\n");
    expect(findArchiveDeletes([{ path: "x.ts", text }])).toEqual(["x.ts:6: .delete()"]);
  });

  it("recursiveDelete(db.collection(ARCHIVE)…)", () => {
    const text = [
      `import { ARCHIVE } from "../core/rankingArchive";`,
      `await db.recursiveDelete(db.collection(ARCHIVE).doc(tid));`,
    ].join("\n");
    expect(findArchiveDeletes([{ path: "x.ts", text }])).toHaveLength(1);
  });

  it("다른 이름의 상수 · 그 상수로 만든 참조를 멀리서 지우기", () => {
    const text = [
      `const KEEP = "ranking_archive";`,
      `const gensRef = db`,
      `  .collection(KEEP)`,
      `  .doc(tid)`,
      `  .collection("gens");`,
      ...Array.from({ length: 20 }, (_, i) => `const filler${i} = ${i};`),
      `const snap = await gensRef.get();`,
      `const batch = db.batch();`,
      `for (const d of snap.docs) batch.delete(d.ref);`,
    ].join("\n");
    const hits = findArchiveDeletes([{ path: "x.ts", text }]);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("보관과 상관없는 지우기 · 주석 · 허용된 시험 이름은 잡지 않는다", () => {
    const text = [
      `import { ARCHIVE } from "./rankingArchive";`,
      `// ARCHIVE 는 절대 delete 하지 않는다`,
      `it("archive-survives-tournament-delete", async () => {});`,
      `await db.doc(\`ranking_archive/\${tid}/gens/0\`).set({ seq: 0 });`,
      `await assertFails(deleteDoc(clientDoc(owner, \`tournaments/\${tid}\`)));`,
      `await db.collection("ranking_cache").doc(tid).delete();`,
    ].join("\n");
    expect(findArchiveDeletes([{ path: "x.ts", text }])).toEqual([]);
  });
});

describe("ranking_archive 는 지우지 않는다", () => {
  it("저장소에서 보관을 가리키는 파일에 지우기 0건", () => {
    const paths = repoFilesMentioningArchive();
    expect(paths.length).toBeGreaterThan(0);
    const files = paths.map((path) => ({ path, text: readFileSync(path, "utf8") }));
    const hits = findArchiveDeletes(files);
    expect(hits).toEqual([]);
  });
});
