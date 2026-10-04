import { act, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import DocViewer, { type DocViewerRef, type IDocument } from "../../index";
import { setAllDocuments } from "../../store/actions";
import { initialState, mainStateReducer } from "../../store/mainStateReducer";
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
const C = { uri: "https://x.test/c.cap", fileType: "cap" };
const live = (loads: { documentURI: string; signal: AbortSignal }[]) =>
  loads.map((l) => `${l.documentURI.slice(-5)} ${l.signal.aborted}`);

describe("(3) documents replaced", () => {
  it("replaced while loading: old load aborted, late result dropped, new one loads", () => {
    const onDocumentLoad = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT, onDocumentLoad };
    const { rerender } = render(<DocViewer documents={[A]} {...props} />);
    rerender(<DocViewer documents={[B, C]} {...props} />);
    expect(live(loads)).toEqual(["a.cap true", "b.cap false"]);
    act(() => loads[0].fileLoaderComplete({ result: "late A" }));
    expect(onDocumentLoad).not.toHaveBeenCalled();
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => loads[1].fileLoaderComplete({ result: "b" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("b.cap|b");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("list changes around a document that is still loading: its load continues, once", () => {
    const onDocumentLoad = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT, onDocumentLoad };
    const { rerender } = render(<DocViewer documents={[A]} {...props} />);
    rerender(<DocViewer documents={[{ ...A }, B]} {...props} />);
    expect(live(loads)).toEqual(["a.cap false"]);
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a");
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Document 1 of 2")).toBeInTheDocument();
  });

  it("same uri with a different explicit fileType reloads with the other renderer", () => {
    const one = makeCapturingRenderer("cap");
    const two = makeCapturingRenderer("other");
    const props = { pluginRenderers: [one.R, two.R], config: NO_TIMEOUT };
    const { rerender } = render(<DocViewer documents={[A]} {...props} />);
    act(() => one.loads[0].fileLoaderComplete({ result: "a" }));
    rerender(
      <DocViewer documents={[{ uri: A.uri, fileType: "other" }]} {...props} />,
    );
    expect(two.loads).toHaveLength(1);
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => two.loads[0].fileLoaderComplete({ result: "a2" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a2");
  });

  it("the shown document removed: falls back to the first entry (or initialActiveDocument)", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer ref={ref} documents={[A, B, C]} {...props} />,
    );
    act(() => ref.current?.next());
    rerender(<DocViewer ref={ref} documents={[A, C]} {...props} />);
    expect(screen.getByText("Document 1 of 2")).toBeInTheDocument();
    expect(live(loads)).toEqual(["a.cap true", "b.cap true", "a.cap false"]);
    rerender(
      <DocViewer
        ref={ref}
        documents={[B, C]}
        initialActiveDocument={C}
        {...props}
      />,
    );
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
  });

  it("the shown document moved: index follows it without a reload", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer ref={ref} documents={[A, B]} {...props} />,
    );
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    rerender(<DocViewer ref={ref} documents={[C, B, A]} {...props} />);
    expect(screen.getByText("Document 3 of 3")).toBeInTheDocument();
    expect(loads).toHaveLength(1);
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a");
  });

  it("duplicate uris: stays on the second copy when the list changes", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT };
    const d1 = { ...A, fileName: "first" };
    const d2 = { ...A, fileName: "second" };
    const { rerender } = render(
      <DocViewer ref={ref} documents={[d1, d2]} {...props} />,
    );
    act(() => ref.current?.next());
    act(() => loads[1].fileLoaderComplete({ result: "a" }));
    rerender(
      <DocViewer ref={ref} documents={[{ ...d1 }, { ...d2 }, B]} {...props} />,
    );
    expect(screen.getByText("Document 2 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("file-name")).toHaveTextContent("second");
    expect(loads).toHaveLength(2);
  });

  it("empty -> non-empty -> empty -> non-empty", () => {
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(<DocViewer documents={[]} {...props} />);
    expect(document.getElementById("no-documents")).not.toBeNull();
    rerender(<DocViewer documents={[A]} {...props} />);
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a");
    rerender(<DocViewer documents={[]} {...props} />);
    expect(document.getElementById("no-documents")).not.toBeNull();
    expect(screen.queryByTestId("loading-renderer")).toBeNull();
    rerender(<DocViewer documents={[A]} {...props} />);
    expect(live(loads)).toEqual(["a.cap true", "a.cap false"]);
    act(() => loads[1].fileLoaderComplete({ result: "a again" }));
    expect(screen.getByTestId("cap")).toHaveTextContent("a.cap|a again");
  });

  it("EMPTY fileType + list grows: the probed type is kept (no re-probe, no second download)", async () => {
    const calls = installManualFetch();
    const onDocumentLoad = vi.fn();
    const file = {
      uri: "blob:https://x.test/1111",
      fileType: "",
      fileName: "a.png",
    };
    const props = { config: NO_TIMEOUT, onDocumentLoad };
    const { rerender } = render(<DocViewer documents={[file]} {...props} />);
    await act(async () => calls[0].respond("x", "image/png"));
    await act(async () => calls[1].respond("png", "image/png"));
    await screen.findByRole("img", { name: "a.png" });
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);

    // the user picks a second file: same first entry, one more appended
    rerender(
      <DocViewer
        documents={[
          { ...file },
          { uri: "blob:https://x.test/2222", fileType: "", fileName: "b.png" },
        ]}
        {...props}
      />,
    );
    expect({
      requests: calls.map((c) => `${c.method} ${c.url.slice(-4)}`),
      imgStillShown: screen.queryByRole("img", { name: "a.png" }) !== null,
    }).toEqual({ requests: ["GET 1111", "GET 1111"], imgStillShown: true });
  });

  it("reducer: SET_ALL_DOCUMENTS keeps the probed type when the entry has fileType ''", () => {
    let state = mainStateReducer(
      initialState,
      setAllDocuments([{ uri: "/a", fileType: "" }]),
    );
    state = {
      ...state,
      currentDocument: { uri: "/a", fileType: "image/png", fileData: "data:" },
      documentLoading: false,
    };
    const loadId = state.loadId;
    state = mainStateReducer(
      state,
      setAllDocuments([{ uri: "/a", fileType: "" }, { uri: "/b" }]),
    );
    expect(state.loadId).toBe(loadId);
    expect(state.currentDocument?.fileType).toBe("image/png");
  });

  it("a fileName removed from the shown entry disappears from the header", () => {
    const { R, loads } = makeCapturingRenderer();
    const props = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer documents={[{ ...A, fileName: "Custom name" }]} {...props} />,
    );
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    expect(screen.getByTestId("file-name")).toHaveTextContent("Custom name");
    rerender(<DocViewer documents={[{ ...A }]} {...props} />);
    expect(screen.getByTestId("file-name")).toHaveTextContent("a.cap");
  });

  it("uncontrolled: inline documents + initialActiveDocument taken from them does not undo navigation", () => {
    const ref = createRef<DocViewerRef>();
    const { R } = makeCapturingRenderer();
    const Host = () => {
      const [, setTitle] = useState("");
      // documents declared in the component body: new objects every render
      const docs: IDocument[] = [
        { uri: A.uri, fileType: "cap" },
        { uri: B.uri, fileType: "cap" },
      ];
      return (
        <DocViewer
          ref={ref}
          documents={docs}
          initialActiveDocument={docs[1]}
          onDocumentChange={(d) => setTitle(d.uri)}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />
      );
    };
    render(<Host />);
    expect(screen.getByText("Document 2 of 2")).toBeInTheDocument();
    act(() => ref.current?.prev());
    expect(screen.getByText(/Document \d of 2/).textContent).toBe(
      "Document 1 of 2",
    );
  });
});
