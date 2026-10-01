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

/**
 * Compares two document lists by content, so a new array with the same
 * entries (an inline `documents={[...]}`) does not reset the viewer.
 * `fileData` is compared by reference.
 */
const sameDocuments = (a: IDocument[], b: IDocument[]): boolean =>
  a === b ||
  (a.length === b.length &&
    a.every((doc, index) => {
      const other = b[index];
      return (
        doc === other ||
        (doc.uri === other.uri &&
          doc.fileType === other.fileType &&
          doc.fileName === other.fileName &&
          doc.fileData === other.fileData)
      );
    }));

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
    onDocumentLoad,
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
      onDocumentLoad,
    };
  });

  // Keep the latest state readable from stable callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Apply a new document list only when its contents change.
  const appliedDocuments = useRef(documents);
  useEffect(() => {
    if (sameDocuments(appliedDocuments.current, documents)) return;
    appliedDocuments.current = documents;
    dispatch(
      setAllDocuments(documents, { activeDocument, initialActiveDocument }),
    );
  });

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
        onDocumentLoad,
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
    onDocumentLoad,
  ]);

  // Controlled mode: follow `activeDocument`. The reducer ignores the
  // dispatch when that document is already on screen.
  useEffect(() => {
    if (activeDocument) dispatch(updateCurrentDocument(activeDocument));
  }, [activeDocument]);

  // Uncontrolled mode: a changed `initialActiveDocument` selects it, as in
  // 1.x. The first run is skipped (the initial state already used it).
  const appliedInitial = useRef(initialActiveDocument);
  useEffect(() => {
    if (appliedInitial.current === initialActiveDocument) return;
    appliedInitial.current = initialActiveDocument;
    if (initialActiveDocument && !stateRef.current.activeDocument) {
      dispatch(updateCurrentDocument(initialActiveDocument));
    }
  }, [initialActiveDocument]);

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
