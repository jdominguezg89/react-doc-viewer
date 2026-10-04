import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import DocViewer, { type DocRenderer, type DocViewerRef } from "../../index";
import { mockDocumentRoutes } from "../../test/helpers";
import {
  installManualFetch,
  makeCapturingRenderer,
  NO_TIMEOUT,
} from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const A = { uri: "https://x.test/a.cap", fileType: "cap" };
const B = { uri: "https://x.test/b.cap", fileType: "cap" };

const simple = (fileLoader: DocRenderer["fileLoader"], withLoader = true) => {
  const R: DocRenderer = ({ mainState }) => (
    <div data-testid="simple">
      {mainState.currentDocument?.uri}|
      {String(mainState.currentDocument?.fileData)}
    </div>
  );
  R.fileTypes = ["cap"];
  R.weight = 1;
  if (withLoader) R.fileLoader = fileLoader;
  return R;
};

describe("(7) custom renderers", () => {
  it("fileLoader = null: the renderer is shown (nothing to load)", () => {
    const onDocumentLoad = vi.fn();
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchSpy);
    render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[simple(null)]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect({
      fetches: fetchSpy.mock.calls.length,
      spinner: screen.queryByTestId("loading-renderer") !== null,
      shown: screen.queryByTestId("simple")?.textContent ?? null,
    }).toEqual({
      fetches: 0,
      spinner: false,
      shown: "https://x.test/a.cap|undefined",
    });
  });

  it("fileLoaderComplete() called synchronously: shown at once, one onDocumentLoad, no fetch", () => {
    const onDocumentLoad = vi.fn();
    const fetchSpy = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchSpy);
    const ref = createRef<DocViewerRef>();
    render(
      <DocViewer
        ref={ref}
        documents={[A, B]}
        pluginRenderers={[
          simple(({ fileLoaderComplete }) => fileLoaderComplete()),
        ]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect(screen.getByTestId("simple")).toHaveTextContent("a.cap|undefined");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(onDocumentLoad).toHaveBeenLastCalledWith(A);
    act(() => ref.current?.next());
    expect(screen.getByTestId("simple")).toHaveTextContent("b.cap|undefined");
    expect(onDocumentLoad).toHaveBeenCalledTimes(2);
    expect(onDocumentLoad).toHaveBeenLastCalledWith(B);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sync loader with a result: fileData present in state and in onDocumentLoad", () => {
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[
          simple(({ fileLoaderComplete }) =>
            fileLoaderComplete({ result: "sync" }),
          ),
        ]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect(screen.getByTestId("simple")).toHaveTextContent("a.cap|sync");
    expect(onDocumentLoad).toHaveBeenCalledWith({ ...A, fileData: "sync" });
  });

  it("fileLoader that never calls back: spinner stays, navigation aborts it and the next one loads", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={[A, B]}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => ref.current?.next());
    expect(loads[0].signal.aborted).toBe(true);
    act(() => loads[1].fileLoaderComplete({ result: "b" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("b.cap|b");
  });

  it("no fileLoader property: the default data-URL loader is used", async () => {
    fetchMock.resetMocks();
    mockDocumentRoutes({ "a.cap": { body: "abc", type: "text/x-cap" } });
    render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[simple(undefined, false)]}
        config={NO_TIMEOUT}
      />,
    );
    expect(await screen.findByTestId("simple")).toHaveTextContent(
      "a.cap|data:text/x-cap;base64,YWJj",
    );
  });

  it("fileLoaderComplete called twice by a loader", () => {
    const onDocumentLoad = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[R]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    act(() => loads[0].fileLoaderComplete({ result: "one" }));
    act(() => loads[0].fileLoaderComplete({ result: "two" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|two");
  });
});

describe("(8) errors", () => {
  it("error, navigate away, come back: retried, error cleared, onError once per attempt", async () => {
    const ref = createRef<DocViewerRef>();
    const onError = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={[A, B]}
        pluginRenderers={[R]}
        onError={onError}
        config={NO_TIMEOUT}
      />,
    );
    act(() => loads[0].onError?.(new Error("first attempt")));
    expect(screen.getByTestId("load-error")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenLastCalledWith(expect.any(Error), A);

    act(() => ref.current?.next());
    expect(screen.queryByTestId("load-error")).toBeNull();
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => loads[1].fileLoaderComplete({ result: "b" }));

    act(() => ref.current?.prev());
    expect(screen.queryByTestId("load-error")).toBeNull();
    expect(loads).toHaveLength(3);
    act(() => loads[2].fileLoaderComplete({ result: "a ok" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a ok");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("probe error, navigate, return: probe retried", async () => {
    const calls = installManualFetch();
    const ref = createRef<DocViewerRef>();
    const onError = vi.fn();
    render(
      <DocViewer
        ref={ref}
        documents={[
          { uri: "https://x.test/1.png" },
          { uri: "https://x.test/2.png" },
        ]}
        onError={onError}
        config={NO_TIMEOUT}
      />,
    );
    await act(async () => calls[0].respond("", "text/plain", 500));
    expect(screen.getByTestId("load-error")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    act(() => ref.current?.next());
    act(() => ref.current?.prev());
    expect(screen.queryByTestId("load-error")).toBeNull();
    const last = calls[calls.length - 1];
    expect(`${last.method} ${last.url.slice(-5)}`).toBe("HEAD 1.png");
    await act(async () => last.respond("", "image/png"));
    await act(async () => calls[calls.length - 1].respond("one", "image/png"));
    expect(
      await screen.findByRole("img", { name: "1.png" }),
    ).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("a late error after completion / a completion after an error", () => {
    const onError = vi.fn();
    const onDocumentLoad = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    const { unmount } = render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[R]}
        onError={onError}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    act(() => loads[0].onError?.(new Error("boom")));
    act(() => loads[0].fileLoaderComplete({ result: "late data" }));
    expect(screen.queryByTestId("loading-renderer")).toBeNull();
    unmount();
  });

  it("an errored document stays in the error state when the list changes around it", () => {
    const onError = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], onError, config: NO_TIMEOUT };
    const { rerender } = render(<DocViewer documents={[A]} {...props} />);
    act(() => loads[0].onError?.(new Error("boom")));
    expect(screen.getByTestId("load-error")).toBeInTheDocument();
    rerender(<DocViewer documents={[{ ...A }, B]} {...props} />);
    // Same document: not reloaded, the error is still shown. Navigating away
    // and back retries.
    expect(loads).toHaveLength(1);
    expect(screen.getByTestId("load-error")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

describe("(9) onDocumentLoad payload", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    mockDocumentRoutes({
      "one.png": { body: "png-one", type: "image/png; charset=binary" },
      "notes.txt": { body: "hello", type: "text/plain" },
    });
  });

  it("probed type: normalized fileType + fileData, original fields kept", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/one.png", fileName: "One" }]}
        onDocumentLoad={onDocumentLoad}
      />,
    );
    await screen.findByRole("img");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(onDocumentLoad.mock.calls[0][0]).toEqual({
      uri: "https://x.test/one.png",
      fileName: "One",
      fileType: "image/png",
      fileData: expect.stringMatching(
        /^data:image\/png;charset=binary;base64,/,
      ),
    });
  });

  it("explicit type: kept as given + fileData; state has the same data", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/notes.txt", fileType: "txt" }]}
        onDocumentLoad={onDocumentLoad}
      />,
    );
    expect(await screen.findByText("hello")).toBeInTheDocument();
    expect(onDocumentLoad.mock.calls).toEqual([
      [{ uri: "https://x.test/notes.txt", fileType: "txt", fileData: "hello" }],
    ]);
  });

  it("inline fileData without a uri: onDocumentLoad is called", () => {
    const onDocumentLoad = vi.fn();
    const R = simple(undefined, false);
    R.fileTypes = ["txt"];
    render(
      <DocViewer
        documents={[{ uri: "", fileType: "txt", fileData: "inline text" }]}
        pluginRenderers={[R]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect(screen.getByTestId("simple")).toHaveTextContent("|inline text");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(onDocumentLoad).toHaveBeenCalledWith(
      expect.objectContaining({ fileType: "txt", fileData: "inline text" }),
    );
  });
});
