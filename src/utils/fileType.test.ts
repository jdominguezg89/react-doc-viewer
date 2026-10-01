import {
  extensionFromUri,
  normalizeFileType,
  resolveFileType,
} from "./fileType";

describe("normalizeFileType", () => {
  it("lower-cases and strips parameters", () => {
    expect(normalizeFileType("Text/HTML; charset=utf-8")).toBe("text/html");
    expect(normalizeFileType("  PDF ")).toBe("pdf");
    expect(normalizeFileType(undefined)).toBe("");
  });
});

describe("extensionFromUri", () => {
  it("returns the lower-cased extension without query or hash", () => {
    expect(extensionFromUri("https://x.test/a/b/File.PDF?x=1#top")).toBe("pdf");
    expect(extensionFromUri("/plain/file")).toBe("");
    expect(extensionFromUri(".hidden")).toBe("");
    expect(extensionFromUri(undefined)).toBe("");
  });
});

describe("resolveFileType", () => {
  it("prefers a usable content type", () => {
    expect(resolveFileType("image/png", "/a.jpg")).toBe("image/png");
  });

  it("falls back to the extension for missing or opaque types", () => {
    expect(resolveFileType(null, "/docs/report.docx")).toBe("docx");
    expect(resolveFileType("application/octet-stream", "/a.PDF")).toBe("pdf");
    expect(resolveFileType("application/octet-stream", "/no-ext")).toBe(
      "application/octet-stream",
    );
    expect(resolveFileType(null, "/no-ext")).toBe("application/octet-stream");
    expect(resolveFileType("", "blob:https://app.test/0b1c-uuid")).toBe(
      "application/octet-stream",
    );
  });
});
