import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { createRoot } from "react-dom/client";
import DocViewer, { type DocViewerRef } from "../../index";
import {
  installManualFetch,
  makeCapturingRenderer,
  NO_TIMEOUT,
  sleep,
  tick,
} from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

const A = { uri: "https://x.test/a.cap", fileType: "cap" };
const B = { uri: "https://x.test/b.cap", fileType: "cap" };
const C = { uri: "https://x.test/c.cap", fileType: "cap" };

describe("(2) navigation with loads in flight", () => {
  it("rapid next()/next() in separate flushes: only the last document completes", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentLoad = vi.fn();
    const onError = vi.fn();
    const calls = installManualFetch({ rejectOnAbort: false });
    const docs = [
      { uri: "https://x.test/1.png" },
      { uri: "https://x.test/2.png" },
      { uri: "https://x.test/3.png" },
    ];
    render(
      <DocViewer
        ref={ref}
        documents={docs}
        onDocumentLoad={onDocumentLoad}
        onError={onError}
        config={NO_TIMEOUT}
      />,
    );
    act(() => ref.current?.next());
    act(() => ref.current?.next());
    expect(
      calls.map((c) => `${c.method} ${c.url.slice(-5)} ${c.signal?.aborted}`),
    ).toEqual(["HEAD 1.png true", "HEAD 2.png true", "HEAD 3.png false"]);
    // late answers for the aborted probes (a fetch that ignores abort)
    await act(async () => {
      calls[0].respond("", "text/plain");
      calls[1].fail(new Error("late failure"));
      await tick();
    });
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    expect(calls).toHaveLength(3);

    await act(async () => {
      calls[2].respond("", "image/png");
      await tick();
    });
    expect(calls).toHaveLength(4);
    await act(async () => {
      calls[3].respond("three", "image/png");
      await sleep(5);
    });
    expect(screen.getByRole("img", { name: "3.png" })).toBeInTheDocument();
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(onDocumentLoad.mock.calls[0][0]).toMatchObject({
      uri: docs[2].uri,
      fileType: "image/png",
    });
  });

  it("next() then prev() back to a document whose first load is still in flight", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentLoad = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={[A, B]}
        pluginRenderers={[R]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    act(() => ref.current?.next());
    act(() => ref.current?.prev());
    expect(
      loads.map((l) => `${l.documentURI.slice(-5)} ${l.signal.aborted}`),
    ).toEqual(["a.cap true", "b.cap true", "a.cap false"]);
    // first (aborted) load of A answers late
    act(() => loads[0].fileLoaderComplete({ result: "stale A" }));
    expect(onDocumentLoad).not.toHaveBeenCalled();
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => loads[2].fileLoaderComplete({ result: "fresh A" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|fresh A");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("WINDOW: the old loader completes after next() was dispatched but before React re-rendered", () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentLoad = vi.fn();
    const { R, loads, renders } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={[A, B]}
        pluginRenderers={[R]}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect(loads).toHaveLength(1);
    act(() => {
      ref.current?.next();
      // old effect not cleaned up yet -> signal not aborted yet
      expect(loads[0].signal.aborted).toBe(false);
      loads[0].fileLoaderComplete({ result: "A-data" });
    });
    expect(loads).toHaveLength(2);
    expect(loads[1].documentURI).toBe(B.uri);
    // B is still being loaded: the spinner must be up and the renderer must
    // not be shown without data.
    const seen = renders.map(
      (d) => `${d?.uri.slice(-5)}|${String(d?.fileData)}`,
    );
    expect({
      status: screen.getByRole("status").textContent,
      spinner: screen.queryByTestId("loading-renderer") !== null,
      rendererShown: screen.queryByTestId("cap")?.textContent ?? null,
      seen,
    }).toEqual({
      status: "Loading...",
      spinner: true,
      rendererShown: null,
      seen: [],
    });
  });

  it("WINDOW: the old loader fails after next() was dispatched but before React re-rendered", () => {
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
    act(() => {
      ref.current?.next();
      loads[0].onError?.(new Error("A failed"));
    });
    expect(loads).toHaveLength(2);
    // B then loads fine
    act(() => loads[1].fileLoaderComplete({ result: "B-data" }));
    expect({
      error: screen.queryByTestId("load-error") !== null,
      shown: screen.queryByTestId("cap")?.textContent ?? null,
    }).toEqual({ error: false, shown: "https://x.test/b.cap|B-data" });
  });

  it("WINDOW (default loader, fetch): old download resolves between dispatch and render", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentLoad = vi.fn();
    const calls = installManualFetch();
    const docs = [
      { uri: "https://x.test/1.png", fileType: "png" },
      { uri: "https://x.test/2.png", fileType: "png" },
    ];
    render(
      <DocViewer
        ref={ref}
        documents={docs}
        onDocumentLoad={onDocumentLoad}
        config={NO_TIMEOUT}
      />,
    );
    expect(calls).toHaveLength(1);
    await act(async () => {
      ref.current?.next();
      calls[0].respond("one", "image/png");
      await sleep(5); // the response is processed before React renders
    });
    expect(calls).toHaveLength(2);
    // (onDocumentLoad for 1.png is fine: it did finish loading)
    expect({
      status: screen.getByRole("status").textContent,
      spinner: screen.queryByTestId("loading-renderer") !== null,
      imgWithoutData: screen.queryByRole("img") !== null,
      loadsFor2: onDocumentLoad.mock.calls.filter(([d]) =>
        d.uri.endsWith("2.png"),
      ).length,
    }).toEqual({
      status: "Loading...",
      spinner: true,
      imgWithoutData: false,
      loadsFor2: 0,
    });
  });
});

describe("(2) real scheduler (no act): navigation from a timer", () => {
  it("the old loader completing in the gap clears the new document's spinner", async () => {
    const env = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const before = env.IS_REACT_ACT_ENVIRONMENT;
    env.IS_REACT_ACT_ENVIRONMENT = false;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      const ref = createRef<DocViewerRef>();
      const onDocumentLoad = vi.fn();
      const { R, loads } = makeCapturingRenderer();
      root.render(
        <DocViewer
          ref={ref}
          documents={[A, B, C]}
          pluginRenderers={[R]}
          onDocumentLoad={onDocumentLoad}
          config={NO_TIMEOUT}
        />,
      );
      await sleep(30);
      expect(loads).toHaveLength(1);

      // e.g. an autoplay timer advancing the viewer, and the previous
      // document's load finishing in the next timer of the same turn
      setTimeout(() => ref.current?.next(), 0);
      setTimeout(() => loads[0].fileLoaderComplete({ result: "A-data" }), 0);
      await sleep(30);

      expect(loads).toHaveLength(2);
      expect(loads[1].documentURI).toBe(B.uri);
      const status = container.querySelector('[role="status"]')?.textContent;
      const cap = container.querySelector('[data-testid="cap"]')?.textContent;
      const spinner =
        container.querySelector('[data-testid="loading-renderer"]') !== null;
      expect({ status, spinner, cap: cap ?? null }).toEqual({
        status: "Loading...",
        spinner: true,
        cap: null,
      });
    } finally {
      root.unmount();
      container.remove();
      env.IS_REACT_ACT_ENVIRONMENT = before;
    }
  });
});
