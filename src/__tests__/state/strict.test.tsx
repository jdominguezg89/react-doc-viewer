import { act, render, screen, waitFor } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import DocViewer, { type DocViewerRef } from "../../index";
import { mockDocumentRoutes } from "../../test/helpers";
import { installManualFetch, NO_TIMEOUT } from "./helpers";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("(1) StrictMode", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    mockDocumentRoutes({
      "one.png": { body: "png-one", type: "image/png" },
      "two.png": { body: "png-two", type: "image/png" },
      "missing.png": { body: "nope", type: "text/plain", status: 404 },
      "letter.docx": { body: "", type: "application/msword" },
    });
  });

  it("default loader: one completed download, onDocumentLoad once, spinner gone", async () => {
    const onDocumentLoad = vi.fn();
    const onError = vi.fn();
    const calls = installManualFetch();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/one.png" }]}
          onDocumentLoad={onDocumentLoad}
          onError={onError}
          config={NO_TIMEOUT}
        />
      </StrictMode>,
    );
    // Strict effects: probe started, aborted, started again.
    expect(calls.map((c) => `${c.method} ${c.signal?.aborted}`)).toEqual([
      "HEAD true",
      "HEAD false",
    ]);
    await act(async () => {
      calls[1].respond("", "image/png");
    });
    const gets = calls.filter((c) => c.method === "GET");
    // the Step 2 effect is not double-invoked on update, so one GET
    expect(gets.map((c) => c.signal?.aborted)).toEqual([false]);
    await act(async () => {
      gets[0].respond("png-one", "image/png");
    });
    expect(await screen.findByRole("img")).toBeInTheDocument();
    expect(screen.queryByTestId("loading-renderer")).toBeNull();
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("explicit fileType: the mount double effect starts two downloads, first aborted", async () => {
    const onDocumentLoad = vi.fn();
    const calls = installManualFetch();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/one.png", fileType: "png" }]}
          onDocumentLoad={onDocumentLoad}
          config={NO_TIMEOUT}
        />
      </StrictMode>,
    );
    expect(calls.map((c) => `${c.method} ${c.signal?.aborted}`)).toEqual([
      "GET true",
      "GET false",
    ]);
    await act(async () => {
      calls[1].respond("png-one", "image/png");
    });
    expect(await screen.findByRole("img")).toBeInTheDocument();
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("a late answer of the aborted first effect is ignored (loader that ignores abort)", async () => {
    const onDocumentLoad = vi.fn();
    const onError = vi.fn();
    const calls = installManualFetch({ rejectOnAbort: false });
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/one.png", fileType: "png" }]}
          onDocumentLoad={onDocumentLoad}
          onError={onError}
          config={NO_TIMEOUT}
        />
      </StrictMode>,
    );
    expect(calls).toHaveLength(2);
    await act(async () => {
      calls[0].fail(new Error("late failure of aborted effect"));
    });
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByTestId("loading-renderer")).toBeInTheDocument();
    await act(async () => {
      calls[1].respond("png-one", "image/png");
    });
    expect(await screen.findByRole("img")).toBeInTheDocument();
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("onError fires once for a failed probe and once for a failed download", async () => {
    const onError = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/missing.png" }]}
          onError={onError}
        />
      </StrictMode>,
    );
    await screen.findByTestId("load-error");
    expect(onError).toHaveBeenCalledTimes(1);
    unmount();

    const onError2 = vi.fn();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/missing.png", fileType: "png" }]}
          onError={onError2}
        />
      </StrictMode>,
    );
    await screen.findByTestId("load-error");
    expect(onError2).toHaveBeenCalledTimes(1);
  });

  it("onDocumentChange fires once per navigation", async () => {
    const ref = createRef<DocViewerRef>();
    const onDocumentChange = vi.fn();
    render(
      <StrictMode>
        <DocViewer
          ref={ref}
          documents={[
            { uri: "https://x.test/one.png" },
            { uri: "https://x.test/two.png" },
          ]}
          onDocumentChange={onDocumentChange}
        />
      </StrictMode>,
    );
    await screen.findByRole("img");
    act(() => ref.current?.next());
    expect(onDocumentChange).toHaveBeenCalledTimes(1);
    await screen.findByRole("img", { name: "two.png" });
  });

  it("SYNC LOADER (Office): onDocumentLoad fires once", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/letter.docx", fileType: "docx" }]}
          onDocumentLoad={onDocumentLoad}
        />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(document.querySelector("iframe")).not.toBeNull(),
    );
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("SYNC LOADER (Office, probed type): onDocumentLoad fires once", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/letter.docx" }]}
          onDocumentLoad={onDocumentLoad}
        />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(document.querySelector("iframe")).not.toBeNull(),
    );
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("SYNC LOADER (video): onDocumentLoad fires once", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <StrictMode>
        <DocViewer
          documents={[{ uri: "https://x.test/clip.mp4", fileType: "mp4" }]}
          onDocumentLoad={onDocumentLoad}
        />
      </StrictMode>,
    );
    await waitFor(() => expect(document.querySelector("video")).not.toBeNull());
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });

  it("non-strict baseline for the sync loader", async () => {
    const onDocumentLoad = vi.fn();
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/letter.docx", fileType: "docx" }]}
        onDocumentLoad={onDocumentLoad}
      />,
    );
    await waitFor(() =>
      expect(document.querySelector("iframe")).not.toBeNull(),
    );
    expect(onDocumentLoad).toHaveBeenCalledTimes(1);
  });
});
