import { describe, expect, it } from "vitest";
import { parseDeployEnv } from "@/lib/deployEnv";

describe("parseDeployEnv — Vercel 배포 종류 (OPS-FIX-1 · D-66)", () => {
  it("production · preview 는 그대로", () => {
    expect(parseDeployEnv("production")).toBe("production");
    expect(parseDeployEnv("preview")).toBe("preview");
  });

  it("그 밖(빈 값 · 로컬 · 모르는 값)은 development — 실서비스로 오인하지 않는다", () => {
    expect(parseDeployEnv(undefined)).toBe("development");
    expect(parseDeployEnv("")).toBe("development");
    expect(parseDeployEnv("development")).toBe("development");
    expect(parseDeployEnv("Production ")).toBe("development");
  });
});
