import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import DocViewer, {
  type DocRenderer,
  type DocViewerRef,
  DocViewerRenderers,
  type IDocument,
} from "../index";
import { mockDocumentRoutes } from "../test/helpers";

const routes = {
  "one.png": { body: "png-one", type: "image/png" },
  "two.png": { body: "png-two", type: "image/png" },
  "notes.txt": { body: "hello from txt", type: "text/plain" },
  "table.csv": { body: "a;b\n1;2\n", type: "text/csv" },
  "page.html": {
    body: "<h1>Framed</h1>",
    type: "text/html",
  },
  "other.html": { body: "<h1>Other</h1>", type: "text/html" },
  "missing.png": { body: "nope", type: "text/plain", status: 404 },
};

beforeEach(() => {
  fetchMock.resetMocks();
  mockDocumentRoutes(routes);
});

describe("DocViewer", () => {
  it("loads an image and renders it as a data URL", async () => {
    render(<DocViewer documents={[{ uri: "https://x.test/one.png" }]} />);
    const img = await screen.findByRole("img");
    expect(img).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/png;base64,/),
    );
    expect(screen.getByTestId("file-name")).toHaveTextContent("one.png");
  });

  it("renders plain text and CSV documents", async () => {
    const { unmount } = render(
      <DocViewer documents={[{ uri: "https://x.test/notes.txt" }]} />,
    );
    expect(await screen.findByText("hello from txt")).toBeInTheDocument();
    unmount();

    render(
      <DocViewer
        documents={[{ uri: "https://x.test/table.csv" }]}
        config={{ csvDelimiter: ";" }}
      />,
    );
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "b" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2" })).toBeInTheDocument();
  });

  it("shows an error state and calls onError when the fetch fails", async () => {
    const onError = vi.fn();
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/missing.png" }]}
        onError={onError}
      />,
    );
    expect(await screen.findByTestId("load-error")).toHaveTextContent(
      "The document could not be loaded.",
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ uri: "https://x.test/missing.png" }),
    );
  });

  it("uses a custom error renderer", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/missing.png" }]}
        config={{
          errorRenderer: {
            overrideComponent: ({ error, fileName }) => (
              <div data-testid="custom-error">
                {fileName}: {error.message}
              </div>
            ),
          },
        }}
      />,
    );
    expect(await screen.findByTestId("custom-error")).toHaveTextContent(
      /missing\.png: Failed to fetch document \(404/,
    );
  });

  it("falls back to the URI extension when the content type is missing", async () => {
    // A binary body: `Response` adds no default content-type for it.
    fetchMock.mockResponse(() =>
      Promise.resolve(new Response(new Uint8Array([137, 80, 78, 71]))),
    );
    render(<DocViewer documents={[{ uri: "https://x.test/three.png" }]} />);
    expect(await screen.findByRole("img")).toBeInTheDocument();
  });

  it("navigates with the ref API and reports onDocumentChange", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentChange = vi.fn();
    const docs = [
      { uri: "https://x.test/one.png" },
      { uri: "https://x.test/two.png" },
    ];
    render(
      <DocViewer
        ref={ref}
        documents={docs}
        onDocumentChange={onDocumentChange}
      />,
    );
    await screen.findByRole("img");

    act(() => ref.current?.next());
    expect(onDocumentChange).toHaveBeenCalledTimes(1);
    expect(onDocumentChange).toHaveBeenLastCalledWith(docs[1]);
    expect(await screen.findByText("Document 2 of 2")).toBeInTheDocument();

    act(() => ref.current?.next()); // out of range: no-op
    expect(onDocumentChange).toHaveBeenCalledTimes(1);

    act(() => ref.current?.prev());
    expect(onDocumentChange).toHaveBeenLastCalledWith(docs[0]);
    expect(await screen.findByText("Document 1 of 2")).toBeInTheDocument();
  });

  it("follows the controlled activeDocument prop", async () => {
    const docs = [
      { uri: "https://x.test/one.png" },
      { uri: "https://x.test/two.png" },
    ];
    const { rerender } = render(
      <DocViewer documents={docs} activeDocument={docs[0]} />,
    );
    await screen.findByRole("img");
    expect(screen.getByTestId("file-name")).toHaveTextContent("one.png");

    rerender(<DocViewer documents={docs} activeDocument={docs[1]} />);
    await waitFor(() =>
      expect(screen.getByTestId("file-name")).toHaveTextContent("two.png"),
    );
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
  });

  it("does not reset the viewer when the parent re-renders with an equal inline array", async () => {
    const ref = createRef<DocViewerRef>();
    const makeDocs = (): IDocument[] => [
      { uri: "https://x.test/one.png" },
      { uri: "https://x.test/two.png" },
    ];
    const { rerender } = render(<DocViewer ref={ref} documents={makeDocs()} />);
    await screen.findByRole("img");
    act(() => ref.current?.next());
    expect(await screen.findByText("Document 2 of 2")).toBeInTheDocument();

    rerender(<DocViewer ref={ref} documents={makeDocs()} />);
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();

    rerender(
      <DocViewer ref={ref} documents={[{ uri: "https://x.test/notes.txt" }]} />,
    );
    expect(await screen.findByText("hello from txt")).toBeInTheDocument();
  });

  it("supports a header override with navigation callbacks", async () => {
    const docs = [
      { uri: "https://x.test/one.png" },
      { uri: "https://x.test/two.png" },
    ];
    render(
      <DocViewer
        documents={docs}
        config={{
          header: {
            overrideComponent: (state, _previous, next) => (
              <button type="button" onClick={next}>
                custom next ({state.currentFileNo + 1})
              </button>
            ),
          },
        }}
      />,
    );
    const button = await screen.findByRole("button", { name: /custom next/ });
    expect(button).toHaveTextContent("custom next (1)");
    act(() => button.click());
    expect(await screen.findByText("custom next (2)")).toBeInTheDocument();
  });

  it("translates the UI and sets dir for RTL languages", async () => {
    const docs = [
      { uri: "https://x.test/one.png" },
      { uri: "https://x.test/two.png" },
    ];
    const { rerender } = render(<DocViewer documents={docs} language="pl" />);
    expect(await screen.findByText("Dokument 1 z 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Następny dokument" }),
    ).toBeEnabled();

    await screen.findByRole("img");

    rerender(<DocViewer documents={docs} language="ar" />);
    const root = screen.getByTestId("react-doc-viewer");
    expect(root).toHaveAttribute("dir", "rtl");
    expect(root).toHaveAttribute("lang", "ar");
  });

  it("maps the theme prop to CSS custom properties", () => {
    render(
      <DocViewer
        documents={[]}
        theme={{ primary: "#123456", disableThemeScrollbar: true }}
      />,
    );
    const root = screen.getByTestId("react-doc-viewer");
    expect(root.style.getPropertyValue("--rdv-primary")).toBe("#123456");
    expect(root).toHaveAttribute("data-themed-scrollbar", "false");
  });

  it("renders HTML in a sandboxed srcdoc iframe and keeps instances separate", async () => {
    render(
      <>
        <DocViewer documents={[{ uri: "https://x.test/page.html" }]} />
        <DocViewer
          documents={[{ uri: "https://x.test/other.html" }]}
          config={{ html: { sandbox: "allow-same-origin" } }}
        />
      </>,
    );
    await waitFor(() => {
      const frames = document.querySelectorAll("iframe");
      expect(frames).toHaveLength(2);
      expect(frames[0]).toHaveAttribute("srcdoc", "<h1>Framed</h1>");
      expect(frames[0]).toHaveAttribute("sandbox", "");
      expect(frames[1]).toHaveAttribute("srcdoc", "<h1>Other</h1>");
      expect(frames[1]).toHaveAttribute("sandbox", "allow-same-origin");
    });
  });

  it("omits requestHeaders for disallowed origins", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/one.png" }]}
        requestHeaders={{ Authorization: "Bearer secret" }}
        config={{ fetch: { sendRequestHeadersTo: "same-origin" } }}
      />,
    );
    await screen.findByRole("img");
    for (const [, init] of fetchMock.mock.calls) {
      const headers = (init as RequestInit | undefined)?.headers as
        | Record<string, string>
        | undefined;
      expect(headers?.Authorization).toBeUndefined();
    }
  });

  it("sends requestHeaders by default and honours requestInit", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/one.png" }]}
        requestHeaders={{ Authorization: "Bearer secret" }}
        requestInit={{ credentials: "include" }}
      />,
    );
    await screen.findByRole("img");
    // Both the content-type probe and the download carry them.
    expect(fetchMock.mock.calls).toHaveLength(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init).toMatchObject({
        headers: { Authorization: "Bearer secret" },
        credentials: "include",
      });
    }
  });

  it("calls onDocumentLoad once data is available", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/one.png" }]}
        onDocumentLoad={onDocumentLoad}
      />,
    );
    await screen.findByRole("img");
    expect(onDocumentLoad).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "https://x.test/one.png",
        fileType: "image/png",
        fileData: expect.stringMatching(/^data:/),
      }),
    );
  });

  it("shows the download fallback for Office documents when the viewer is disabled", async () => {
    fetchMock.mockResponse("", {
      headers: { "content-type": "application/msword" },
    });
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/letter.doc" }]}
        config={{ msdoc: { enabled: false } }}
      />,
    );
    expect(await screen.findByTestId("no-renderer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download file" })).toHaveAttribute(
      "href",
      "https://x.test/letter.doc",
    );
  });
});

describe("opaque content types", () => {
  const binary = () =>
    Promise.resolve(new Response(new Uint8Array([137, 80, 78, 71])));

  it("shows the no-renderer state for an unknown type instead of loading forever", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(binary);
    render(
      <DocViewer documents={[{ uri: "blob:https://x.test/0b1c-4d5e" }]} />,
    );
    expect(await screen.findByTestId("no-renderer")).toHaveTextContent(
      "application/octet-stream",
    );
  });

  it("lets a custom renderer claim application/octet-stream (blob images)", async () => {
    fetchMock.resetMocks();
    fetchMock.mockResponse(binary);
    const BlobImageRenderer: DocRenderer = ({ mainState }) => (
      <img alt="blob" src={mainState.currentDocument?.fileData as string} />
    );
    BlobImageRenderer.fileTypes = ["image/png", "application/octet-stream"];
    BlobImageRenderer.weight = 1;

    render(
      <DocViewer
        documents={[{ uri: "blob:https://x.test/0b1c-4d5e" }]}
        pluginRenderers={[...DocViewerRenderers, BlobImageRenderer]}
      />,
    );
    expect(
      await screen.findByRole("img", { name: "blob" }),
    ).toBeInTheDocument();
  });
});

describe("loading state machine", () => {
  const methodOf = (init: unknown) =>
    ((init as RequestInit | undefined)?.method ?? "GET").toUpperCase();
  const downloadsOf = (suffix: string) =>
    fetchMock.mock.calls.filter(
      ([url, init]) => String(url).endsWith(suffix) && methodOf(init) === "GET",
    );

  beforeEach(() => {
    fetchMock.resetMocks();
    mockDocumentRoutes({
      "one.png": { body: "png-one", type: "image/png" },
      "notes.txt": { body: "hello from txt", type: "text/plain" },
      "letter.docx": { body: "", type: "application/msword" },
      "bin.html": { body: "<h1>Bin</h1>", type: "application/octet-stream" },
      "photo.jfif": { body: "jfif-bytes", type: "application/octet-stream" },
    });
  });

  it("keeps the shown document when the list grows or an entry is renamed", async () => {
    const first = { uri: "https://x.test/notes.txt", fileType: "txt" };
    const { rerender } = render(<DocViewer documents={[first]} />);
    expect(await screen.findByText("hello from txt")).toBeInTheDocument();
    const requests = fetchMock.mock.calls.length;

    rerender(
      <DocViewer
        documents={[
          { ...first, fileName: "Renamed" },
          { uri: "https://x.test/one.png", fileType: "png" },
        ]}
      />,
    );
    await screen.findByText("Document 1 of 2");
    expect(screen.getByText("hello from txt")).toBeInTheDocument();
    expect(screen.getByTestId("file-name")).toHaveTextContent("Renamed");
    expect(screen.queryByTestId("loading-renderer")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls).toHaveLength(requests);
  });

  it("navigates between two entries that share a uri", async () => {
    const ref = createRef<DocViewerRef>();
    const docs = [
      { uri: "https://x.test/one.png", fileName: "first" },
      { uri: "https://x.test/one.png", fileName: "second" },
    ];
    render(<DocViewer ref={ref} documents={docs} />);
    expect(
      await screen.findByRole("img", { name: "first" }),
    ).toBeInTheDocument();

    act(() => ref.current?.next());
    expect(
      await screen.findByRole("img", { name: "second" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
  });

  it("never loads a document with the previous document's renderer", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        ref={ref}
        documents={[
          { uri: "https://x.test/letter.docx" },
          { uri: "https://x.test/one.png" },
        ]}
        onDocumentLoad={onDocumentLoad}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("iframe")).not.toBeNull(),
    );
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);

    act(() => ref.current?.next());
    const img = await screen.findByRole("img", { name: "one.png" });
    expect(img).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/png/),
    );

    // one callback per document, the second one with data; one download
    expect(onDocumentLoad).toHaveBeenCalledTimes(2);
    expect(onDocumentLoad).toHaveBeenLastCalledWith(
      expect.objectContaining({
        uri: "https://x.test/one.png",
        fileData: expect.stringMatching(/^data:image\/png/),
      }),
    );
    expect(downloadsOf("one.png")).toHaveLength(1);
  });

  it("probes the type when fileType is an empty string", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/one.png", fileType: "" }]}
      />,
    );
    expect(
      await screen.findByRole("img", { name: "one.png" }),
    ).toBeInTheDocument();
  });

  it("follows a changed initialActiveDocument", async () => {
    const docs = [
      { uri: "https://x.test/notes.txt" },
      { uri: "https://x.test/one.png" },
    ];
    const { rerender } = render(
      <DocViewer documents={docs} initialActiveDocument={docs[0]} />,
    );
    expect(await screen.findByText("hello from txt")).toBeInTheDocument();

    rerender(<DocViewer documents={docs} initialActiveDocument={docs[1]} />);
    expect(
      await screen.findByRole("img", { name: "one.png" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
  });

  it("renders an .html file served as application/octet-stream", async () => {
    render(<DocViewer documents={[{ uri: "https://x.test/bin.html" }]} />);
    await waitFor(() =>
      expect(document.querySelector("iframe")).toHaveAttribute(
        "srcdoc",
        "<h1>Bin</h1>",
      ),
    );
  });

  it("gives unknown extensions to a renderer registered for octet-stream", async () => {
    const BlobImageRenderer: DocRenderer = ({ mainState }) => (
      <img alt="custom" src={mainState.currentDocument?.fileData as string} />
    );
    BlobImageRenderer.fileTypes = ["image/png", "application/octet-stream"];
    BlobImageRenderer.weight = 1;

    render(
      <DocViewer
        documents={[{ uri: "https://x.test/photo.jfif" }]}
        pluginRenderers={[...DocViewerRenderers, BlobImageRenderer]}
      />,
    );
    expect(
      await screen.findByRole("img", { name: "custom" }),
    ).toBeInTheDocument();
  });

  it("streams video by extension without downloading it", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/clip.mp4", fileType: "mp4" }]}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("video")).toHaveAttribute(
        "src",
        "https://x.test/clip.mp4",
      ),
    );
    expect(fetchMock.mock.calls).toHaveLength(0);
  });

  it("resolves a relative Office viewer URL instead of throwing", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/letter.docx" }]}
        config={{ msdoc: { viewerUrl: "/office/embed.aspx" } }}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("iframe")?.getAttribute("src")).toMatch(
        /\/office\/embed\.aspx\?src=https%3A%2F%2Fx\.test%2Fletter\.docx$/,
      ),
    );
  });

  it("announces loading and the shown document in a status region", async () => {
    render(
      <DocViewer
        documents={[
          { uri: "https://x.test/one.png" },
          { uri: "https://x.test/notes.txt" },
        ]}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading...");
    await screen.findByRole("img");
    expect(screen.getByRole("status")).toHaveTextContent(
      "one.png Document 1 of 2",
    );
    expect(screen.getByRole("region", { name: "one.png" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("does not HTML-escape values in translations", async () => {
    render(
      <DocViewer
        documents={[{ uri: "", fileType: "application/postscript" }]}
        language="ja"
      />,
    );
    const fallback = await screen.findByTestId("no-renderer");
    expect(fallback).toHaveTextContent("application/postscript");
    expect(fallback.textContent).not.toContain("&#x2F;");
  });
});
