"use client";

import {
  createContext,
  type Dispatch,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
} from "react";
import type { DocViewerProps } from "../DocViewer";
import { defaultLanguage, locales } from "../i18n";
import type { DocViewerRef, IDocument } from "../models";
import {
  type MainStateActions,
  nextDocument,
  previousDocument,
  setAllDocuments,
  setMainConfig,
  syncProps,
  updateCurrentDocument,
} from "./actions";
import {
  findDocumentIndex,
  type IMainState,
  initialState,
  mainStateReducer,
} from "./mainStateReducer";

export interface DocViewerContextValue {
  state: IMainState;
  dispatch: Dispatch<MainStateActions>;
  /** Navigates to the previous document and notifies `onDocumentChange`. */
  previous: () => void;
  /** Navigates to the next document and notifies `onDocumentChange`. */
  next: () => void;
}

const DocViewerContext = createContext<DocViewerContextValue>({
  state: initialState,
  dispatch: () => null,
  previous: () => null,
  next: () => null,
});

/** Stable signature of a document list, so inline arrays do not reset the viewer. */
const documentsSignature = (documents: IDocument[]): string =>
  documents
    .map(
      (doc) =>
        `${doc.uri}\u0001${doc.fileType ?? ""}\u0001${doc.fileName ?? ""}`,
    )
    .join("\u0002");

const DocViewerProvider = forwardRef<
  DocViewerRef,
  PropsWithChildren<DocViewerProps>
>((props, ref) => {
  const {
    children,
    documents,
    config,
    pluginRenderers,
    prefetchMethod,
    requestHeaders,
    requestInit,
    initialActiveDocument,
    language,
    activeDocument,
    onDocumentChange,
    onError,
  } = props;

  const resolvedLanguage =
    language && locales[language] ? language : defaultLanguage;

  const [state, dispatch] = useReducer(mainStateReducer, undefined, () => {
    const startDocument = activeDocument ?? initialActiveDocument;
    const index = Math.max(findDocumentIndex(documents, startDocument), 0);
    return {
      ...initialState,
      documents: documents || [],
      currentDocument: documents?.[index],
      currentFileNo: index,
      documentLoading: (documents?.length ?? 0) > 0,
      config,
      pluginRenderers,
      prefetchMethod,
      requestHeaders,
      requestInit,
      language: resolvedLanguage,
      activeDocument,
      onDocumentChange,
      onError,
    };
  });

  // Keep the latest state readable from stable callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Reset the document list only when its contents change, not its identity.
  const signature = documentsSignature(documents);
  const previousSignature = useRef(signature);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the signature is the change detector for `documents`
  useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    dispatch(
      setAllDocuments(documents, activeDocument ?? initialActiveDocument),
    );
  }, [signature]);

  useEffect(() => {
    if (config) dispatch(setMainConfig(config));
  }, [config]);

  useEffect(() => {
    dispatch(
      syncProps({
        pluginRenderers,
        prefetchMethod,
        requestHeaders,
        requestInit,
        language: resolvedLanguage,
        activeDocument,
        onDocumentChange,
        onError,
      }),
    );
  }, [
    pluginRenderers,
    prefetchMethod,
    requestHeaders,
    requestInit,
    resolvedLanguage,
    activeDocument,
    onDocumentChange,
    onError,
  ]);

  useEffect(() => {
    if (!activeDocument) return;
    if (activeDocument.uri === stateRef.current.currentDocument?.uri) return;
    dispatch(updateCurrentDocument(activeDocument));
  }, [activeDocument]);

  const previous = useCallback(() => {
    const {
      currentFileNo,
      documents: docs,
      onDocumentChange: notify,
    } = stateRef.current;
    if (currentFileNo <= 0) return;
    dispatch(previousDocument());
    notify?.(docs[currentFileNo - 1]);
  }, []);

  const next = useCallback(() => {
    const {
      currentFileNo,
      documents: docs,
      onDocumentChange: notify,
    } = stateRef.current;
    if (currentFileNo >= docs.length - 1) return;
    dispatch(nextDocument());
    notify?.(docs[currentFileNo + 1]);
  }, []);

  useImperativeHandle(ref, () => ({ prev: previous, next }), [previous, next]);

  return (
    <DocViewerContext.Provider value={{ state, dispatch, previous, next }}>
      {children}
    </DocViewerContext.Provider>
  );
});

export { DocViewerContext, DocViewerProvider };
