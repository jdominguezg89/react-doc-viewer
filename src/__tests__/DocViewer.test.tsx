import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import DocViewer, { type DocViewerRef, type IDocument } from "../index";
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
  noext: { body: "png-noext", type: "image/png" },
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

    rerender(<DocViewer documents={docs} language="ar" />);
    expect(screen.getByTestId("react-doc-viewer")).toHaveAttribute(
      "dir",
      "rtl",
    );
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
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toEqual({
      Authorization: "Bearer secret",
    });
    expect((init as RequestInit).credentials).toBe("include");
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
