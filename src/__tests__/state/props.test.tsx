import { act, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import DocViewer, {
  type DocRenderer,
  type DocViewerRef,
  DocViewerRenderers,
  type IDocument,
} from "../../index";
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

describe("(5) inline fileData recreated on every render", () => {
  it("one reload per parent render, no loop", () => {
    let mounts = 0;
    const Inline: DocRenderer = ({ mainState }) => {
      useState(() => mounts++);
      return (
        <div data-testid="inline">
          {(mainState.currentDocument?.fileData as ArrayBuffer)?.byteLength}
        </div>
      );
    };
    Inline.fileTypes = ["bin"];
    Inline.weight = 1;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    let hostRenders = 0;
    const Host = ({ n }: { n: number }) => {
      hostRenders++;
      return (
        <DocViewer
          documents={[
            { uri: "", fileType: "bin", fileData: new ArrayBuffer(8 + n) },
          ]}
          pluginRenderers={[Inline]}
          config={NO_TIMEOUT}
        />
      );
    };
    const { rerender } = render(<Host n={0} />);
    expect(screen.getByTestId("inline")).toHaveTextContent("8");
    const m0 = mounts;
    for (let i = 1; i <= 4; i++) rerender(<Host n={i} />);
    expect(screen.getByTestId("inline")).toHaveTextContent("12");
    expect(hostRenders).toBe(5);
    expect(mounts - m0).toBeLessThanOrEqual(4);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("a stable fileData reference does not reload", () => {
    let mounts = 0;
    const Inline: DocRenderer = () => {
      useState(() => mounts++);
      return <div data-testid="inline" />;
    };
    Inline.fileTypes = ["bin"];
    Inline.weight = 1;
    const data = new ArrayBuffer(8);
    const Host = ({ n }: { n: number }) => (
      <DocViewer
        documents={[{ uri: "", fileType: "bin", fileData: data }]}
        pluginRenderers={[Inline]}
        config={NO_TIMEOUT}
        data-n={n}
      />
    );
    const { rerender } = render(<Host n={0} />);
    for (let i = 1; i <= 4; i++) rerender(<Host n={i} />);
    expect(mounts).toBe(1);
  });

  it("upload example: object URLs created once survive parent re-renders", async () => {
    installManualFetch();
    const ref = createRef<DocViewerRef>();
    const files = [
      new File(["a"], "a.png", { type: "image/png" }),
      new File(["b"], "b.png", { type: "image/png" }),
    ];
    const Host = () => {
      const [, setTitle] = useState("");
      // Object URLs are created once, not on every render (see README).
      const [documents] = useState(() =>
        files.map((file) => ({
          uri: URL.createObjectURL(file),
          fileName: file.name,
        })),
      );
      return (
        <DocViewer
          ref={ref}
          documents={documents}
          onDocumentChange={(d) => setTitle(d.fileName ?? "")}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    expect(screen.getByText("Document 1 of 2")).toBeInTheDocument();
    act(() => ref.current?.next());
    expect(screen.getByText(/Document \d of 2/).textContent).toBe(
      "Document 2 of 2",
    );
  });
});

describe("(6) props changing after mount", () => {
  it("an inline pluginRenderers array on every render does not reload", () => {
    const { R, loads } = makeCapturingRenderer();
    const Host = ({ n }: { n: number }) => (
      <DocViewer
        documents={[A, B]}
        pluginRenderers={[...DocViewerRenderers, R]}
        config={NO_TIMEOUT}
        data-n={n}
      />
    );
    const { rerender } = render(<Host n={0} />);
    for (let i = 1; i <= 4; i++) rerender(<Host n={i} />);
    expect(loads).toHaveLength(1);
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    for (let i = 5; i <= 8; i++) rerender(<Host n={i} />);
    expect(loads).toHaveLength(1);
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a");
  });

  it("requestHeaders / requestInit / config changed in an earlier render are used by the next load", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const base = { ref, documents: [A, B], pluginRenderers: [R] };
    const { rerender } = render(
      <DocViewer
        {...base}
        requestHeaders={{ Authorization: "old" }}
        config={NO_TIMEOUT}
      />,
    );
    expect(loads[0].headers).toEqual({ Authorization: "old" });
    rerender(
      <DocViewer
        {...base}
        requestHeaders={{ Authorization: "new" }}
        requestInit={{ credentials: "include" }}
        config={NO_TIMEOUT}
      />,
    );
    expect(loads).toHaveLength(1); // no reload because of the change
    act(() => ref.current?.next());
    expect(loads[1].headers).toEqual({ Authorization: "new" });
    expect(loads[1].requestInit).toEqual({ credentials: "include" });

    rerender(
      <DocViewer
        {...base}
        requestHeaders={{ Authorization: "new" }}
        config={{
          ...NO_TIMEOUT,
          fetch: { sendRequestHeadersTo: "same-origin" },
        }}
      />,
    );
    act(() => ref.current?.prev());
    expect(loads[2].headers).toBeUndefined();
  });

  it("SAME RENDER: per-document headers set from onDocumentChange reach that document's request", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const docs = [A, B];
    const Host = () => {
      const [active, setActive] = useState<IDocument>(docs[0]);
      return (
        <DocViewer
          ref={ref}
          documents={docs}
          activeDocument={active}
          onDocumentChange={setActive}
          requestHeaders={{
            "X-Doc-Token": `token-for-${active.uri.slice(-5)}`,
          }}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    expect(loads[0].headers).toEqual({ "X-Doc-Token": "token-for-a.cap" });
    act(() => ref.current?.next());
    const forB = loads.filter(
      (l) => l.documentURI === B.uri && !l.signal.aborted,
    );
    expect(forB.map((l) => l.headers)).toEqual([
      { "X-Doc-Token": "token-for-b.cap" },
    ]);
  });

  it("SAME RENDER (props only): activeDocument and requestHeaders changed together", () => {
    const { R, loads } = makeCapturingRenderer();
    const base = {
      documents: [A, B],
      pluginRenderers: [R],
      config: NO_TIMEOUT,
    };
    const { rerender } = render(
      <DocViewer {...base} activeDocument={A} requestHeaders={{ t: "a" }} />,
    );
    rerender(
      <DocViewer {...base} activeDocument={B} requestHeaders={{ t: "b" }} />,
    );
    const forB = loads.filter(
      (l) => l.documentURI === B.uri && !l.signal.aborted,
    );
    expect(forB.map((l) => l.headers)).toEqual([{ t: "b" }]);
  });

  it("SAME RENDER: documents replaced together with requestHeaders", () => {
    const { R, loads } = makeCapturingRenderer();
    const base = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer {...base} documents={[A]} requestHeaders={{ t: "a" }} />,
    );
    rerender(
      <DocViewer {...base} documents={[B]} requestHeaders={{ t: "b" }} />,
    );
    const forB = loads.filter(
      (l) => l.documentURI === B.uri && !l.signal.aborted,
    );
    expect(forB.map((l) => l.headers)).toEqual([{ t: "b" }]);
  });

  it("a removed config prop stops applying", () => {
    const { R } = makeCapturingRenderer();
    const { rerender } = render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[R]}
        config={{ header: { disableHeader: true } }}
      />,
    );
    expect(screen.queryByTestId("file-name")).toBeNull();
    rerender(<DocViewer documents={[A]} pluginRenderers={[R]} />);
    expect(screen.queryByTestId("file-name")).not.toBeNull();
  });
});
