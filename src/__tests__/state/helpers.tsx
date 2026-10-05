import type { DocRenderer, IDocument } from "../../index";
import type { FileLoaderFuncProps } from "../../utils/fileLoaders";

interface Pending {
  url: string;
  method: string;
  headers: Record<string, string> | undefined;
  init: RequestInit | undefined;
  signal: AbortSignal | undefined;
  respond: (body?: string, type?: string | null, status?: number) => void;
  fail: (error: Error) => void;
}

/** fetch replaced by a manually resolved one. */
export const installManualFetch = ({ rejectOnAbort = true } = {}) => {
  const calls: Pending[] = [];
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal ?? undefined;
      const call: Pending = {
        url: String(input),
        method: (init?.method ?? "GET").toUpperCase(),
        headers: init?.headers as Record<string, string> | undefined,
        init,
        signal,
        respond: (body = "", type = "text/plain", status = 200) =>
          resolve(
            new Response(body, {
              status,
              headers: type ? { "content-type": type } : {},
            }),
          ),
        fail: reject,
      };
      if (rejectOnAbort && signal) {
        const abort = () =>
          reject(new DOMException("The operation was aborted.", "AbortError"));
        if (signal.aborted) abort();
        signal.addEventListener("abort", abort);
      }
      calls.push(call);
    });
  });
  vi.stubGlobal("fetch", fn);
  return calls;
};

/** A renderer whose loader is driven by the test. */
export const makeCapturingRenderer = (fileType = "cap") => {
  const loads: FileLoaderFuncProps[] = [];
  const renders: Array<IDocument | undefined> = [];
  const R: DocRenderer = ({ mainState }) => {
    renders.push(mainState.currentDocument);
    return (
      <div data-testid="cap">
        {String(mainState.currentDocument?.uri)}|
        {String(mainState.currentDocument?.fileData)}
      </div>
    );
  };
  R.fileTypes = [fileType];
  R.weight = 1;
  R.fileLoader = (props) => {
    loads.push(props);
  };
  return { R, loads, renders };
};

export const NO_TIMEOUT = {
  loadingRenderer: { showLoadingTimeout: false as const },
};

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const tick = async (n = 5) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};
