import {
  createContext,
  type Dispatch,
  forwardRef,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
} from "react";
import type { DocViewerProps } from "../DocViewer";
import { defaultLanguage, locales } from "../i18n";
import type { DocViewerRef, IDocument } from "../models";
import {
  type MainStateActions,
  type NextDocument,
  nextDocument,
  type PreviousDocument,
  previousDocument,
  setAllDocuments,
  updateCurrentDocument,
} from "./actions";
import {
  findDocumentIndex,
  type IMainState,
  initialState,
  mainStateReducer,
} from "./mainStateReducer";

interface DocViewerContextValue {
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
const sameDocument = (
  a: IDocument | undefined,
  b: IDocument | undefined,
): boolean =>
  a === b ||
  (a !== undefined &&
    b !== undefined &&
    a.uri === b.uri &&
    a.fileType === b.fileType &&
    a.fileName === b.fileName &&
    a.fileData === b.fileData);

const sameDocuments = (a: IDocument[], b: IDocument[]): boolean =>
  a === b ||
  (a.length === b.length &&
    a.every((doc, index) => sameDocument(doc, b[index])));

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

  const [reducerState, dispatch] = useReducer(
    mainStateReducer,
    undefined,
    () => {
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
    },
  );

  // Props are merged in at render time instead of being synced through an
  // effect, so a load started in this commit already sees them.
  const state = useMemo<IMainState>(
    () => ({
      ...reducerState,
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
    }),
    [
      reducerState,
      config,
      pluginRenderers,
      prefetchMethod,
      requestHeaders,
      requestInit,
      resolvedLanguage,
      activeDocument,
      onDocumentChange,
      onError,
      onDocumentLoad,
    ],
  );

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

  // Controlled mode: follow `activeDocument`. The reducer ignores the
  // dispatch when that document is already on screen.
  useEffect(() => {
    if (activeDocument) dispatch(updateCurrentDocument(activeDocument));
  }, [activeDocument]);

  // Uncontrolled mode: a changed `initialActiveDocument` selects it, as in
  // 1.x. The first run is skipped (the initial state already used it).
  const appliedInitial = useRef(initialActiveDocument);
  useEffect(() => {
    const applied = appliedInitial.current;
    appliedInitial.current = initialActiveDocument;
    // Compared by content, like `documents`: an entry of an inline array is a
    // new object on every render.
    if (sameDocument(applied, initialActiveDocument)) return;
    if (initialActiveDocument && !stateRef.current.activeDocument) {
      dispatch(updateCurrentDocument(initialActiveDocument));
    }
  }, [initialActiveDocument]);

  const navigate = useCallback((action: NextDocument | PreviousDocument) => {
    const before = stateRef.current;
    const after = mainStateReducer(before, action);
    if (after === before) return;
    // A second call before React re-renders starts from the new position.
    stateRef.current = after;
    dispatch(action);
    if (after.currentDocument) {
      before.onDocumentChange?.(after.currentDocument);
    }
  }, []);

  const previous = useCallback(() => navigate(previousDocument()), [navigate]);
  const next = useCallback(() => navigate(nextDocument()), [navigate]);

  useImperativeHandle(ref, () => ({ prev: previous, next }), [previous, next]);

  return (
    <DocViewerContext.Provider value={{ state, dispatch, previous, next }}>
      {children}
    </DocViewerContext.Provider>
  );
});

export { DocViewerContext, DocViewerProvider };
