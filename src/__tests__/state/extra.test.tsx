import { act, render, screen } from "@testing-library/react";
import { createRef, StrictMode, useState } from "react";
import DocViewer, { type DocViewerRef, type IDocument } from "../../index";
import {
  extensionFromUri,
  resolveFileType,
  resolveFileTypeForRenderers,
} from "../../utils/fileType";
import { makeCapturingRenderer, NO_TIMEOUT } from "./helpers";

const A = { uri: "https://x.test/a.cap", fileType: "cap" };
const B = { uri: "https://x.test/b.cap", fileType: "cap" };
const C = { uri: "https://x.test/c.cap", fileType: "cap" };
const live = (loads: { documentURI: string; signal: AbortSignal }[]) =>
  loads.map((l) => `${l.documentURI.slice(-5)} ${l.signal.aborted}`);

describe("extra", () => {
  it("unmount during a load: late completion and late error are ignored", () => {
    const onDocumentLoad = vi.fn();
    const onError = vi.fn();
    const { R, loads } = makeCapturingRenderer();
    const { unmount } = render(
      <DocViewer
        documents={[A]}
        pluginRenderers={[R]}
        onDocumentLoad={onDocumentLoad}
        onError={onError}
      />,
    );
    unmount();
    expect(loads[0].signal.aborted).toBe(true);
    loads[0].fileLoaderComplete({ result: "late" });
    loads[0].onError?.(new Error("late"));
    expect(onDocumentLoad).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("controlled: list grows and activeDocument moves to the new entry in the same render", () => {
    const { R, loads } = makeCapturingRenderer();
    const base = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer {...base} documents={[A, B]} activeDocument={A} />,
    );
    act(() => loads[0].fileLoaderComplete({ result: "a" }));
    rerender(<DocViewer {...base} documents={[A, B, C]} activeDocument={C} />);
    expect(live(loads)).toEqual(["a.cap true", "c.cap false"]);
    expect(screen.getByText("Document 3 of 3")).toBeInTheDocument();
  });

  it("controlled: list grows, activeDocument unchanged: no reload", () => {
    const { R, loads } = makeCapturingRenderer();
    const base = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer {...base} documents={[A, B]} activeDocument={B} />,
    );
    act(() => loads[0].fileLoaderComplete({ result: "b" }));
    rerender(<DocViewer {...base} documents={[C, A, B]} activeDocument={B} />);
    expect(loads).toHaveLength(1);
    expect(screen.getByText("Document 3 of 3")).toBeInTheDocument();
    expect(screen.getByTestId("cap")).toHaveTextContent("b.cap|b");
  });

  it("controlled: activeDocument set one render before it appears in documents: one load", () => {
    const { R, loads } = makeCapturingRenderer();
    const base = { pluginRenderers: [R], config: NO_TIMEOUT };
    const { rerender } = render(
      <DocViewer {...base} documents={[A, B]} activeDocument={A} />,
    );
    rerender(<DocViewer {...base} documents={[A, B]} activeDocument={C} />);
    rerender(<DocViewer {...base} documents={[A, B, C]} activeDocument={C} />);
    expect(live(loads)).toEqual(["a.cap true", "c.cap false"]);
    expect(screen.getByText("Document 3 of 3")).toBeInTheDocument();
  });

  it("StrictMode + controlled README pattern: one live load per navigation, one onDocumentChange", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const docs = [A, B, C];
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
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    act(() => ref.current?.next());
    expect(seen).toEqual(["b.cap"]);
    expect(
      loads
        .filter((l) => !l.signal.aborted)
        .map((l) => l.documentURI.slice(-5)),
    ).toEqual(["b.cap"]);
    expect(loads.filter((l) => l.documentURI === B.uri)).toHaveLength(1);
  });

  it("uncontrolled: an unrelated parent re-render does not undo navigation (inline documents + initialActiveDocument)", () => {
    const ref = createRef<DocViewerRef>();
    const { R, loads } = makeCapturingRenderer();
    const Host = ({ tick }: { tick: number }) => {
      const docs: IDocument[] = [
        { uri: A.uri, fileType: "cap" },
        { uri: B.uri, fileType: "cap" },
      ];
      return (
        <div data-tick={tick}>
          <DocViewer
            ref={ref}
            documents={docs}
            initialActiveDocument={docs[1]}
            pluginRenderers={[R]}
            config={NO_TIMEOUT}
          />
        </div>
      );
    };
    const { rerender } = render(<Host tick={0} />);
    act(() => ref.current?.prev());
    expect(screen.getByText("Document 1 of 2")).toBeInTheDocument();
    act(() => loads[loads.length - 1].fileLoaderComplete({ result: "a" }));
    rerender(<Host tick={1} />);
    expect({
      shown: document.getElementById("doc-nav-info")?.textContent,
      loads: loads.length,
    }).toEqual({ shown: "Document 1 of 2", loads: 2 });
  });

  it("uncontrolled: a stable initialActiveDocument reference keeps navigation (baseline)", () => {
    const ref = createRef<DocViewerRef>();
    const { R } = makeCapturingRenderer();
    const docs = [A, B];
    const Host = ({ tick }: { tick: number }) => (
      <div data-tick={tick}>
        <DocViewer
          ref={ref}
          documents={docs}
          initialActiveDocument={docs[1]}
          pluginRenderers={[R]}
          config={NO_TIMEOUT}
        />
      </div>
    );
    const { rerender } = render(<Host tick={0} />);
    act(() => ref.current?.prev());
    rerender(<Host tick={1} />);
    expect(screen.getByText("Document 1 of 2")).toBeInTheDocument();
  });
});

describe("fileType utils", () => {
  it("extension / resolution edge cases", () => {
    expect(extensionFromUri("https://x.test/a/b.PDF?x=1#y")).toBe("pdf");
    expect(extensionFromUri("https://x.test/dir.v2/file")).toBe("");
    expect(extensionFromUri("https://x.test/download?file=a.pdf")).toBe("");
    expect(extensionFromUri("blob:https://x.test/0b1c-4d5e")).toBe("");
    expect(extensionFromUri("/.htaccess")).toBe("");
    expect(resolveFileType("Application/PDF; charset=x", "/a.bin")).toBe(
      "application/pdf",
    );
    expect(resolveFileType("binary/octet-stream", "/a.PDF")).toBe("pdf");
    expect(resolveFileType(null, "/a")).toBe("application/octet-stream");
    expect(resolveFileType("", "/a")).toBe("application/octet-stream");
    expect(
      resolveFileTypeForRenderers(
        "application/octet-stream",
        "/a.jfif",
        (t) => t === "application/octet-stream",
      ),
    ).toBe("application/octet-stream");
    expect(
      resolveFileTypeForRenderers(
        "application/octet-stream",
        "/a.png",
        (t) => t === "png" || t === "application/octet-stream",
      ),
    ).toBe("png");
    expect(
      resolveFileTypeForRenderers("text/plain", "/a.png", () => true),
    ).toBe("text/plain");
    // host-only URL: the TLD is taken for an extension (informational)
  });
});
