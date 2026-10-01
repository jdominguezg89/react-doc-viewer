import { type Dispatch, useContext, useEffect, useRef } from "react";
import type { DocRenderer } from "../models";
import {
  type MainStateActions,
  patchCurrentDocument,
  setDocumentError,
  setDocumentLoading,
} from "../store/actions";
import { DocViewerContext } from "../store/DocViewerProvider";
import type { IMainState } from "../store/mainStateReducer";
import {
  defaultFileLoader,
  type FileLoaderComplete,
  type FileLoaderFuncProps,
} from "../utils/fileLoaders";
import {
  normalizeFileType,
  resolveFileTypeForRenderers,
  UNKNOWN_FILE_TYPE,
} from "../utils/fileType";
import { shouldSendRequestHeaders } from "../utils/requestPolicy";
import { selectRenderer, useRendererSelector } from "./useRendererSelector";

const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));

/**
 * Custom Hook for loading the current document into context
 */
export const useDocumentLoader = (): {
  state: IMainState;
  dispatch: Dispatch<MainStateActions>;
  CurrentRenderer: DocRenderer | null | undefined;
} => {
  const { state, dispatch } = useContext(DocViewerContext);
  const { currentDocument, loadId } = state;

  // Effects read callbacks, headers and config from here so they always see
  // the latest props without re-running when those change.
  const latest = useRef(state);
  latest.current = state;

  const { CurrentRenderer } = useRendererSelector();

  const hasDocument = currentDocument !== undefined;
  const documentURI = currentDocument?.uri || "";
  // An empty type (e.g. `fileType: file.type` for an unrecognised File) is
  // treated as unknown, so the probe still runs.
  const hasKnownType = normalizeFileType(currentDocument?.fileType) !== "";

  // Step 1: discover the file type (unless the consumer provided one).
  useEffect(() => {
    if (!hasDocument || hasKnownType) return;

    if (!documentURI) {
      // Nothing to probe: fall through to a renderer registered for unknown
      // files, or to the "no renderer" state.
      dispatch(patchCurrentDocument(loadId, { fileType: UNKNOWN_FILE_TYPE }));
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const { prefetchMethod, requestHeaders, requestInit, config } =
      latest.current;
    const method =
      prefetchMethod ?? (documentURI.startsWith("blob:") ? "GET" : "HEAD");

    fetch(documentURI, {
      ...requestInit,
      method,
      signal,
      headers: shouldSendRequestHeaders(documentURI, config)
        ? requestHeaders
        : undefined,
    })
      .then((response) => {
        if (signal.aborted) return;
        if (!response.ok) {
          throw new Error(
            `Failed to fetch document (${response.status} ${response.statusText})`.trim(),
          );
        }
        const renderers = latest.current.pluginRenderers;
        const fileType = resolveFileTypeForRenderers(
          response.headers.get("content-type"),
          documentURI,
          (type) => Boolean(selectRenderer(type, renderers)),
        );
        dispatch(patchCurrentDocument(loadId, { fileType }));
      })
      .catch((reason) => {
        if (signal.aborted) return;
        const error = toError(reason);
        if (error.name === "AbortError") return;
        dispatch(setDocumentError(error));
        latest.current.onError?.(error, latest.current.currentDocument);
      });

    return () => {
      controller.abort();
    };
  }, [hasDocument, hasKnownType, documentURI, loadId, dispatch]);

  // Step 2: load the document data with the renderer's loader.
  useEffect(() => {
    if (!hasDocument || CurrentRenderer === undefined) return;

    if (CurrentRenderer === null || !documentURI) {
      // Nothing to render, or nothing to fetch (inline fileData only).
      dispatch(setDocumentLoading(false));
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    const { requestHeaders, requestInit, config } = latest.current;

    const fileLoaderComplete: FileLoaderComplete = (fileReader) => {
      if (signal.aborted) return;
      const result = fileReader?.result;
      const patch =
        result !== null && result !== undefined ? { fileData: result } : {};
      dispatch(patchCurrentDocument(loadId, patch));
      dispatch(setDocumentLoading(false));
      const loaded = latest.current.currentDocument;
      if (loaded) latest.current.onDocumentLoad?.({ ...loaded, ...patch });
    };

    const loaderFunctionProps: FileLoaderFuncProps = {
      documentURI,
      signal,
      fileLoaderComplete,
      onError: (error) => {
        if (signal.aborted) return;
        dispatch(setDocumentError(error));
        latest.current.onError?.(error, latest.current.currentDocument);
      },
      headers: shouldSendRequestHeaders(documentURI, config)
        ? requestHeaders
        : undefined,
      requestInit,
    };

    if (CurrentRenderer.fileLoader !== undefined) {
      CurrentRenderer.fileLoader?.(loaderFunctionProps);
    } else {
      defaultFileLoader(loaderFunctionProps);
    }

    return () => {
      controller.abort();
    };
  }, [hasDocument, CurrentRenderer, documentURI, loadId, dispatch]);

  return { state, dispatch, CurrentRenderer };
};
