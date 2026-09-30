import { type Dispatch, useContext, useEffect } from "react";
import type { DocRenderer } from "../models";
import {
  type MainStateActions,
  setDocumentError,
  setDocumentLoading,
  updateCurrentDocument,
} from "../store/actions";
import { DocViewerContext } from "../store/DocViewerProvider";
import type { IMainState } from "../store/mainStateReducer";
import {
  defaultFileLoader,
  type FileLoaderComplete,
  type FileLoaderFuncProps,
} from "../utils/fileLoaders";
import { resolveFileType } from "../utils/fileType";
import { useRendererSelector } from "./useRendererSelector";

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
  const { currentDocument, prefetchMethod, requestHeaders, requestInit } =
    state;

  const { CurrentRenderer } = useRendererSelector();

  const documentURI = currentDocument?.uri || "";
  const knownFileType = currentDocument?.fileType;

  // Step 1: discover the file type (unless the consumer provided one).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run only when the document (URI) or its known type changes
  useEffect(() => {
    if (!documentURI || knownFileType !== undefined) return;

    const controller = new AbortController();
    const { signal } = controller;
    const method =
      prefetchMethod ?? (documentURI.startsWith("blob:") ? "GET" : "HEAD");

    fetch(documentURI, {
      ...requestInit,
      method,
      signal,
      headers: requestHeaders,
    })
      .then((response) => {
        if (signal.aborted) return;
        if (!response.ok) {
          throw new Error(
            `Failed to fetch document (${response.status} ${response.statusText})`.trim(),
          );
        }
        const fileType = resolveFileType(
          response.headers.get("content-type"),
          documentURI,
        );
        const latest = stateRefDocument(state, documentURI);
        dispatch(updateCurrentDocument({ ...latest, fileType }));
      })
      .catch((reason) => {
        if (signal.aborted) return;
        const error = toError(reason);
        if (error.name === "AbortError") return;
        dispatch(setDocumentError(error));
        state.onError?.(error, currentDocument);
      });

    return () => {
      controller.abort();
    };
  }, [documentURI, knownFileType]);

  // Step 2: load the document data with the renderer's loader.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload only when the renderer or the document (URI) changes
  useEffect(() => {
    if (!currentDocument || CurrentRenderer === undefined) return;

    if (CurrentRenderer === null || !documentURI) {
      // Nothing to render, or nothing to fetch (inline fileData only).
      dispatch(setDocumentLoading(false));
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const fileLoaderComplete: FileLoaderComplete = (fileReader) => {
      if (signal.aborted) return;
      const updatedDocument = { ...currentDocument };
      if (fileReader && fileReader.result !== null) {
        updatedDocument.fileData = fileReader.result;
      }
      dispatch(updateCurrentDocument(updatedDocument));
      dispatch(setDocumentLoading(false));
    };

    const loaderFunctionProps: FileLoaderFuncProps = {
      documentURI,
      signal,
      fileLoaderComplete,
      onError: (error) => {
        if (signal.aborted) return;
        dispatch(setDocumentError(error));
        state.onError?.(error, currentDocument);
      },
      headers: requestHeaders,
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
  }, [CurrentRenderer, documentURI]);

  return { state, dispatch, CurrentRenderer };
};

/** The current document if it still matches the URI being probed. */
const stateRefDocument = (state: IMainState, uri: string) =>
  state.currentDocument && state.currentDocument.uri === uri
    ? state.currentDocument
    : { uri };
