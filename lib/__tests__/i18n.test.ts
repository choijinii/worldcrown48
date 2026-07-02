import { describe, expect, it } from "vitest";
import { resolveBootLang } from "../resolveBootLang";

const url = (search: string) => new URL(`http://x.com/${search}`);

describe("resolveBootLang", () => {
  it("?lang=es → es", () => {
    expect(resolveBootLang({ url: url("?lang=es"), navigatorLang: "en-US" })).toBe("es");
  });
  it("?lang=ko → ko, ?lang=en → en", () => {
    expect(resolveBootLang({ url: url("?lang=ko"), navigatorLang: "es-ES" })).toBe("ko");
    expect(resolveBootLang({ url: url("?lang=en"), navigatorLang: "ko-KR" })).toBe("en");
  });
  it("navigator es-MX (no query) → es", () => {
    expect(resolveBootLang({ url: url(""), navigatorLang: "es-MX" })).toBe("es");
  });
  it("navigator ko-KR → ko; anything else → en default", () => {
    expect(resolveBootLang({ url: url(""), navigatorLang: "ko-KR" })).toBe("ko");
    expect(resolveBootLang({ url: url(""), navigatorLang: "fr-FR" })).toBe("en");
  });
  it("unknown ?lang=xx falls through to navigator/default", () => {
    expect(resolveBootLang({ url: url("?lang=xx"), navigatorLang: "es-AR" })).toBe("es");
    expect(resolveBootLang({ url: url("?lang=xx"), navigatorLang: "fr" })).toBe("en");
  });
});
