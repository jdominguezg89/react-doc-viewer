// @vitest-environment node
import { renderToString } from "react-dom/server";

describe("server-side rendering", () => {
  it("renders DocViewer to a string without a DOM", async () => {
    expect(typeof globalThis.document).toBe("undefined");
    const { default: DocViewer } = await import("../index");
    const html = renderToString(
      <DocViewer
        documents={[
          { uri: "https://x.test/one.png" },
          { uri: "https://x.test/two.pdf" },
        ]}
        theme={{ primary: "#abcdef" }}
      />,
    );
    expect(html).toContain('id="react-doc-viewer"');
    expect(html).toContain("--rdv-primary:#abcdef");
    expect(html).toContain("Document 1 of 2");
  });
});
