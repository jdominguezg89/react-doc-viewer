import { decodeHtmlDataUrl } from "./index";

describe("decodeHtmlDataUrl", () => {
  it("decodes base64 payloads with a charset", () => {
    const html = "<p>héllo 中文</p>";
    const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(html)));
    expect(
      decodeHtmlDataUrl(`data:text/html;charset=utf-8;base64,${base64}`),
    ).toBe(html);
  });

  it("decodes percent-encoded payloads", () => {
    expect(decodeHtmlDataUrl("data:text/html,%3Cb%3Ehi%3C%2Fb%3E")).toBe(
      "<b>hi</b>",
    );
  });

  it("throws on invalid base64 so the renderer can show an error", () => {
    expect(() => decodeHtmlDataUrl("data:text/html;base64,***")).toThrow();
  });
});
