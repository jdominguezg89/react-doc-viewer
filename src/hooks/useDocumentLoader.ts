import { type Dispatch, useContext, useEffect } from "react";
import type { DocRenderer } from "..";
import {
  type MainStateActions,
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
import { useRendererSelector } from "./useRendererSelector";

/**
 * Custom Hook for loading the current document into context
 */
export const useDocumentLoader = (): {
  state: IMainState;
  dispatch: Dispatch<MainStateActions>;
  CurrentRenderer: DocRenderer | null | undefined;
} => {
  const { state, dispatch } = useContext(DocViewerContext);
  const { currentFileNo, currentDocument, prefetchMethod } = state;

  const { CurrentRenderer } = useRendererSelector();

  const documentURI = currentDocument?.uri || "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy dependency list, revisited in the loader rewrite
  useEffect(() => {
    if (!currentDocument || currentDocument.fileType !== undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    fetch(documentURI, {
      method:
        prefetchMethod || documentURI.startsWith("blob:") ? "GET" : "HEAD",
      signal,
      headers: state?.requestHeaders,
    })
      .then((response) => {
        const contentTypeRaw = response.headers.get("content-type");
        const contentTypes = contentTypeRaw?.split(";") || [];
        const contentType = contentTypes.length ? contentTypes[0] : undefined;

        dispatch(
          updateCurrentDocument({
            ...currentDocument,
            fileType: contentType || undefined,
          }),
        );
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          throw error;
        }
      });

    return () => {
      controller.abort();
    };
  }, [currentFileNo, documentURI, currentDocument]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy dependency list, revisited in the loader rewrite
  useEffect(() => {
    if (!currentDocument || CurrentRenderer === undefined) return;

    const controller = new AbortController();
    const { signal } = controller;

    const fileLoaderComplete: FileLoaderComplete = (fileReader) => {
      if (!currentDocument || !fileReader) {
        dispatch(setDocumentLoading(false));
        return;
      }

      const updatedDocument = { ...currentDocument };
      if (fileReader.result !== null) {
        updatedDocument.fileData = fileReader.result;
      }

      dispatch(updateCurrentDocument(updatedDocument));
      dispatch(setDocumentLoading(false));
    };

    const loaderFunctionProps: FileLoaderFuncProps = {
      documentURI,
      signal,
      fileLoaderComplete,
      headers: state?.requestHeaders,
    };

    if (CurrentRenderer === null) {
      dispatch(setDocumentLoading(false));
    } else if (CurrentRenderer.fileLoader !== undefined) {
      CurrentRenderer.fileLoader?.(loaderFunctionProps);
    } else {
      defaultFileLoader(loaderFunctionProps);
    }

    return () => {
      controller.abort();
    };
  }, [CurrentRenderer, currentFileNo]);

  return { state, dispatch, CurrentRenderer };
};
