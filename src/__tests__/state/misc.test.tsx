import { act, render, screen } from "@testing-library/react";
import { createRef } from "react";
import DocViewer, { type DocRenderer, type DocViewerRef } from "../../index";
import { mockDocumentRoutes } from "../../test/helpers";
import { makeCapturingRenderer, NO_TIMEOUT } from "./helpers";

const A = { uri: "https://x.test/a.cap", fileType: "cap" };
const B = { uri: "https://x.test/b.cap", fileType: "cap" };

describe("misc", () => {
  it("pluginRenderers={undefined} falls back to the built-in renderers", async () => {
    fetchMock.resetMocks();
    mockDocumentRoutes({ "notes.txt": { body: "hello", type: "text/plain" } });
    const custom: DocRenderer[] | undefined = undefined;
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/notes.txt" }]}
        pluginRenderers={custom}
      />,
    );
    expect(await screen.findByText("hello")).toBeInTheDocument();
  });

  it("stale failure in the window: which document does onError report, and does B recover?", () => {
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
    act(() => loads[1].fileLoaderComplete({ result: "B-data" }));
  });
});
