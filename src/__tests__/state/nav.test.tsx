import { act, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import DocViewer, { type DocViewerRef, type IDocument } from "../../index";
import { makeCapturingRenderer, NO_TIMEOUT } from "./helpers";

const A = { uri: "https://x.test/a.cap", fileType: "cap" };
const B = { uri: "https://x.test/b.cap", fileType: "cap" };
const C = { uri: "https://x.test/c.cap", fileType: "cap" };
const docs = [A, B, C];

describe("(2b) several navigation calls before React re-renders", () => {
  it("next(); next() in one tick: onDocumentChange reports the document that ends up shown", () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentChange = vi.fn();
    const { R } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={docs}
        pluginRenderers={[R]}
        onDocumentChange={onDocumentChange}
        config={NO_TIMEOUT}
      />,
    );
    act(() => {
      ref.current?.next();
      ref.current?.next();
    });
    expect({
      shown: screen.getByText(/Document \d of 3/).textContent,
      reported: onDocumentChange.mock.calls.map(([d]) => d.uri.slice(-5)),
    }).toEqual({ shown: "Document 3 of 3", reported: ["b.cap", "c.cap"] });
  });

  it("next(); prev() in one tick ends on the first document", () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentChange = vi.fn();
    const { R } = makeCapturingRenderer();
    render(
      <DocViewer
        ref={ref}
        documents={docs}
        pluginRenderers={[R]}
        onDocumentChange={onDocumentChange}
        config={NO_TIMEOUT}
      />,
    );
    act(() => {
      ref.current?.next();
      ref.current?.prev();
    });
    expect({
      shown: screen.getByText(/Document \d of 3/).textContent,
      reported: onDocumentChange.mock.calls.map(([d]) => d.uri.slice(-5)),
    }).toEqual({ shown: "Document 1 of 3", reported: ["b.cap", "a.cap"] });
  });

  it("controlled (README pattern): next(); next() in one tick", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const seen: string[] = [];
    const Host = () => {
      const [active, setActive] = useState<IDocument>(docs[0]);
      return (
        <DocViewer
          ref={ref}
          documents={docs}
          activeDocument={active}
          onDocumentChange={(d) => {
            seen.push(d.uri.slice(-5));
            setActive(d);
          }}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    act(() => {
      ref.current?.next();
      ref.current?.next();
    });
    expect({
      shown: screen.getByText(/Document \d of 3/).textContent,
      seen,
      liveLoads: loads
        .filter((l) => !l.signal.aborted)
        .map((l) => l.documentURI.slice(-5)),
    }).toEqual({
      shown: "Document 3 of 3",
      seen: ["b.cap", "c.cap"],
      liveLoads: ["c.cap"],
    });
  });

  it("two clicks on the Next button in separate events work (baseline)", () => {
    const onDocumentChange = vi.fn();
    const { R } = makeCapturingRenderer();
    render(
      <DocViewer
        documents={docs}
        pluginRenderers={[R]}
        onDocumentChange={onDocumentChange}
        config={NO_TIMEOUT}
      />,
    );
    const next = screen.getByRole("button", { name: "Next document" });
    act(() => next.click());
    act(() => next.click());
    expect(screen.getByText("Document 3 of 3")).toBeInTheDocument();
    expect(onDocumentChange.mock.calls.map(([d]) => d.uri.slice(-5))).toEqual([
      "b.cap",
      "c.cap",
    ]);
  });
});

describe("(4) controlled mode", () => {
  it("README pattern: exactly one load per navigation", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    let renders = 0;
    const Host = () => {
      renders++;
      const [active, setActive] = useState<IDocument>(docs[0]);
      return (
        <DocViewer
          ref={ref}
          documents={docs}
          activeDocument={active}
          onDocumentChange={setActive}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    expect(loads).toHaveLength(1);
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    act(() => ref.current?.next());
    expect(loads.map((l) => l.documentURI.slice(-5))).toEqual([
      "a.cap",
      "b.cap",
    ]);
    act(() => loads[1].fileLoaderComplete({ result: "b" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("b.cap|b");
    act(() => ref.current?.prev());
    expect(loads.map((l) => l.documentURI.slice(-5))).toEqual([
      "a.cap",
      "b.cap",
      "a.cap",
    ]);
    expect(loads[2].signal.aborted).toBe(false);
    expect(renders).toBeLessThan(6);
  });

  it("README pattern with probing (no fileType): one HEAD + one GET per document", async () => {
    const { installManualFetch } = await import("./helpers");
    const calls = installManualFetch();
    const ref = createRef<DocViewerRef>();
    const pngs = [
      { uri: "https://x.test/1.png" },
      { uri: "https://x.test/2.png" },
    ];
    const Host = () => {
      const [active, setActive] = useState<IDocument>(pngs[0]);
      return (
        <DocViewer
          ref={ref}
          documents={pngs}
          activeDocument={active}
          onDocumentChange={setActive}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    await act(async () => calls[0].respond("", "image/png"));
    await act(async () => calls[1].respond("one", "image/png"));
    await screen.findByRole("img", { name: "1.png" });
    act(() => ref.current?.next());
    await act(async () => calls[2].respond("", "image/png"));
    await act(async () => calls[3].respond("two", "image/png"));
    await screen.findByRole("img", { name: "2.png" });
    // (signals of finished requests are aborted later by effect cleanups; harmless)
    expect(calls.map((c) => `${c.method} ${c.url.slice(-5)}`)).toEqual([
      "HEAD 1.png",
      "GET 1.png",
      "HEAD 2.png",
      "GET 2.png",
    ]);
    vi.unstubAllGlobals();
  });

  it("activeDocument and documents changing in the same render: one load, of the new active document", () => {
    const { R, loads } = makeCapturingRenderer();
    const D = { uri: "https://x.test/d.cap", fileType: "cap" };
    const E = { uri: "https://x.test/e.cap", fileType: "cap" };
    const { rerender } = render(
      <DocViewer
        documents={[A, B]}
        activeDocument={B}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    expect(loads.map((l) => l.documentURI.slice(-5))).toEqual(["b.cap"]);
    rerender(
      <DocViewer
        documents={[D, E]}
        activeDocument={E}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    expect(
      loads.map((l) => `${l.documentURI.slice(-5)} ${l.signal.aborted}`),
    ).toEqual(["b.cap true", "e.cap false"]);
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
  });

  it("activeDocument that is not in documents does not crash or loop", () => {
    const { R, loads } = makeCapturingRenderer();
    const X = { uri: "https://x.test/x.cap", fileType: "cap" };
    const { rerender } = render(
      <DocViewer
        documents={[A, B]}
        activeDocument={X}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    for (let i = 0; i < 3; i++) {
      rerender(
        <DocViewer
          documents={[A, B]}
          activeDocument={X}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />,
      );
    }
    // mount effect on A is replaced by the controlled document
    expect(
      loads.map((l) => `${l.documentURI.slice(-5)} ${l.signal.aborted}`),
    ).toEqual(["a.cap true", "x.cap false"]);
  });

  it("activeDocument as a new inline object on every render: no reload, bounded renders", () => {
    const { R, loads, renders } = makeCapturingRenderer();
    let hostRenders = 0;
    const Host = ({ n }: { n: number }) => {
      hostRenders++;
      return (
        <DocViewer
          documents={[A, B]}
          activeDocument={{ uri: B.uri }}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
          data-n={n}
        />
      );
    };
    const { rerender } = render(<Host n={0} />);
    expect(loads.map((l) => l.documentURI.slice(-5))).toEqual(["b.cap"]);
    act(() => loads[0].fileLoaderComplete({ result: "b" }));
    const before = renders.length;
    for (let i = 1; i <= 5; i++) rerender(<Host n={i} />);
    expect(loads).toHaveLength(1);
    expect(hostRenders).toBe(6);
    // renderer re-renders: at most twice per parent render (props + SYNC_PROPS)
    expect(renders.length - before).toBeLessThanOrEqual(10);
    expect(screen.getByTestId("cap")).toHaveTextContent("b.cap|b");
  });

  it("activeDocument given by uri only keeps the list entry's fileName and fileType", () => {
    const { R, loads } = makeCapturingRenderer();
    const list = [
      { uri: "https://x.test/a", fileType: "cap", fileName: "Alpha" },
      { uri: "https://x.test/b", fileType: "cap", fileName: "Beta" },
    ];
    const calls = (
      globalThis.fetch as unknown as { mock?: { calls: unknown[] } }
    ).mock;
    const beforeFetches = calls?.calls.length ?? 0;
    const { rerender } = render(
      <DocViewer
        documents={list}
        activeDocument={{ uri: list[0].uri }}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    expect(screen.getByTestId("file-name")).toHaveTextContent("Alpha");
    rerender(
      <DocViewer
        documents={list}
        activeDocument={{ uri: list[1].uri }}
        pluginRenderers={[R]}
        config={NO_TIMEOUT}
      />,
    );
    expect({
      fileName: screen.getByTestId("file-name").textContent,
      loaderStarted: loads.map((l) => l.documentURI.slice(-1)),
      probes: (calls?.calls.length ?? 0) - beforeFetches,
    }).toEqual({ fileName: "Beta", loaderStarted: ["a", "b"], probes: 0 });
  });
});
