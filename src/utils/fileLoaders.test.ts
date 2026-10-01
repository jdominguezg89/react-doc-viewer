import { bytesToDataUrl, decodeText } from "./fileLoaders";

describe("bytesToDataUrl", () => {
  it("keeps the mime type and charset, drops other parameters", () => {
    const bytes = new TextEncoder().encode("hi");
    expect(bytesToDataUrl(bytes, "text/html; charset=utf-8; boundary=x")).toBe(
      "data:text/html;charset=utf-8;base64,aGk=",
    );
    expect(bytesToDataUrl(bytes, "")).toBe(
      "data:application/octet-stream;base64,aGk=",
    );
  });

  it("handles large payloads", () => {
    const bytes = new Uint8Array(200_000).fill(65);
    expect(bytesToDataUrl(bytes, "image/png")).toMatch(
      /^data:image\/png;base64,QUFB/,
    );
  });
});

describe("decodeText", () => {
  const bytes = (...values: number[]) => new Uint8Array(values).buffer;

  it("honours a UTF-16 byte-order mark", () => {
    expect(
      decodeText(bytes(0xff, 0xfe, 0x61, 0x00, 0x3b, 0x00, 0x62, 0x00)),
    ).toBe("a;b");
    expect(decodeText(bytes(0xfe, 0xff, 0x00, 0x61))).toBe("a");
  });

  it("uses the declared charset, then falls back to UTF-8", () => {
    const latin1 = bytes(0x63, 0x61, 0x66, 0xe9);
    expect(decodeText(latin1, "text/csv; charset=iso-8859-1")).toBe("café");
    expect(decodeText(latin1, 'text/csv; charset="windows-1252"')).toBe("café");
    const utf8 = new TextEncoder().encode("café").buffer as ArrayBuffer;
    expect(decodeText(utf8, "text/plain")).toBe("café");
    expect(decodeText(bytes(0x61), "text/plain; charset=not-a-charset")).toBe(
      "a",
    );
  });
});
