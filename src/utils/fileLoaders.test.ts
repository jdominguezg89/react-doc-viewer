import { bytesToDataUrl } from "./fileLoaders";

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
