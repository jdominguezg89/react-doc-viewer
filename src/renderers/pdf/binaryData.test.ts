import { BundledBinaryDataFactory, bundledPdfjsWasm } from "./binaryData";

describe("BundledBinaryDataFactory", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(async () => ({
      body: "\u0000asm",
      status: 200,
    }));
  });

  it("serves the bundled wasm decoders without any URL configured", async () => {
    const factory = new BundledBinaryDataFactory({});
    const bytes = await factory.fetch({
      kind: "wasmUrl",
      filename: "jbig2.wasm",
    });
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(fetchMock.mock.calls[0][0]).toBe(
      bundledPdfjsWasm["jbig2.wasm"].href,
    );
    expect(bundledPdfjsWasm["jbig2.wasm"].href).toMatch(/jbig2\.wasm$/);
    expect(bundledPdfjsWasm["openjpeg.wasm"].href).toMatch(/openjpeg\.wasm$/);
  });

  it("resolves other files against the configured base URL", async () => {
    const factory = new BundledBinaryDataFactory({ cMapUrl: "/pdfjs/cmaps/" });
    await factory.fetch({
      kind: "cMapUrl",
      filename: "Adobe-Japan1-UCS2.bcmap",
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/pdfjs/cmaps/Adobe-Japan1-UCS2.bcmap",
    );
  });

  it("reports a missing base URL the way pdf.js does", async () => {
    const factory = new BundledBinaryDataFactory({});
    await expect(
      factory.fetch({ kind: "standardFontDataUrl", filename: "FoxitSans.pfb" }),
    ).rejects.toThrow(
      "Ensure that the `standardFontDataUrl` API parameter is provided.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails on an HTTP error instead of handing pdf.js an error page", async () => {
    fetchMock.mockResponse(async () => ({ body: "nope", status: 404 }));
    const factory = new BundledBinaryDataFactory({ wasmUrl: "/w/" });
    await expect(
      factory.fetch({ kind: "wasmUrl", filename: "qcms_bg.wasm" }),
    ).rejects.toThrow(
      "Unable to load wasmUrl data at: /w/qcms_bg.wasm (HTTP 404)",
    );
  });
});
