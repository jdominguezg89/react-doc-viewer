import { type AvailableLanguages, defaultLanguage } from "../i18n";
import type { DocRenderer, IConfig, IDocument } from "../models";
import { normalizeFileType } from "../utils/fileType";
import {
  type MainStateActions,
  NEXT_DOCUMENT,
  PATCH_CURRENT_DOCUMENT,
  PREVIOUS_DOCUMENT,
  SET_ALL_DOCUMENTS,
  SET_DOCUMENT_ERROR,
  SET_DOCUMENT_LOADING,
  SET_MAIN_CONFIG,
  SET_RENDERER_RECT,
  SYNC_PROPS,
  UPDATE_CURRENT_DOCUMENT,
} from "./actions";

export type IMainState = {
  currentFileNo: number;
  documents: IDocument[];
  documentLoading?: boolean;
  /** Set when the current document failed to load; cleared on navigation. */
  documentError?: Error;
  currentDocument?: IDocument;
  /**
   * Internal: incremented every time a document has to be (re)loaded. Loader
   * effects depend on it and loader results carry it, so late results for a
   * previous load are dropped.
   */
  loadId: number;
  rendererRect?: DOMRect;
  config?: IConfig;
  pluginRenderers?: DocRenderer[];
  prefetchMethod?: string;
  requestHeaders?: Record<string, string>;
  requestInit?: Omit<RequestInit, "signal" | "headers" | "method" | "body">;
  language: AvailableLanguages;
  activeDocument?: IDocument;
  onDocumentChange?: (document: IDocument) => void;
  onError?: (error: Error, document?: IDocument) => void;
  onDocumentLoad?: (document: IDocument) => void;
};

export const initialState: IMainState = {
  currentFileNo: 0,
  documents: [],
  documentLoading: true,
  documentError: undefined,
  currentDocument: undefined,
  loadId: 0,
  rendererRect: undefined,
  config: {},
  pluginRenderers: [],
  language: defaultLanguage,
};

export type MainStateReducer = (
  state: IMainState,
  action: MainStateActions,
) => IMainState;

/** Finds a document by reference first, then by URI. */
export const findDocumentIndex = (
  documents: IDocument[],
  document: IDocument | undefined,
): number => {
  if (!document) return -1;
  const byReference = documents.indexOf(document);
  if (byReference >= 0) return byReference;
  return documents.findIndex((doc) => doc.uri === document.uri);
};

/**
 * Where the currently shown document sits in a new list: its old position if
 * the entry there still has the same URI (keeps duplicates apart), otherwise
 * the first entry with that URI, otherwise -1.
 */
const locateCurrent = (documents: IDocument[], state: IMainState): number => {
  const current = state.currentDocument;
  if (!current) return -1;
  if (documents[state.currentFileNo]?.uri === current.uri) {
    return state.currentFileNo;
  }
  return documents.findIndex((doc) => doc.uri === current.uri);
};

/** True when `next` describes the document that is already loaded as `current`. */
const isSameLoadedDocument = (
  current: IDocument | undefined,
  next: IDocument | undefined,
): boolean => {
  if (!current || !next || current.uri !== next.uri) return false;
  if (next.fileData !== undefined && next.fileData !== current.fileData) {
    return false;
  }
  const nextType = normalizeFileType(next.fileType);
  return !nextType || nextType === normalizeFileType(current.fileType);
};

const startLoading = (
  state: IMainState,
  currentFileNo: number,
  currentDocument: IDocument | undefined,
): IMainState => ({
  ...state,
  currentFileNo,
  currentDocument,
  documentLoading: currentDocument !== undefined,
  documentError: undefined,
  loadId: state.loadId + 1,
});

export const mainStateReducer: MainStateReducer = (
  state = initialState,
  action: MainStateActions,
): IMainState => {
  switch (action.type) {
    case SET_ALL_DOCUMENTS: {
      const { documents, activeDocument, initialActiveDocument } = action;

      // Controlled selection, else the document already on screen (if it is
      // still in the list), else the initial document, else the first one.
      let index = findDocumentIndex(documents, activeDocument);
      if (index < 0) index = locateCurrent(documents, state);
      if (index < 0)
        index = findDocumentIndex(documents, initialActiveDocument);
      if (index < 0) index = 0;

      const target = documents[index];
      const current = state.currentDocument;

      if (current && isSameLoadedDocument(current, target)) {
        // Same document: keep what was already loaded instead of reloading.
        return {
          ...state,
          documents,
          currentFileNo: index,
          currentDocument: {
            ...current,
            ...target,
            fileType: target.fileType ?? current.fileType,
            fileData: target.fileData ?? current.fileData,
          },
        };
      }

      return startLoading({ ...state, documents }, index, target);
    }

    case SET_DOCUMENT_LOADING: {
      return { ...state, documentLoading: action.value };
    }

    case SET_DOCUMENT_ERROR: {
      return {
        ...state,
        documentError: action.error,
        documentLoading: action.error ? false : state.documentLoading,
      };
    }

    case NEXT_DOCUMENT: {
      if (state.currentFileNo >= state.documents.length - 1) return state;
      const index = state.currentFileNo + 1;
      return startLoading(state, index, state.documents[index]);
    }

    case PREVIOUS_DOCUMENT: {
      if (state.currentFileNo <= 0) return state;
      const index = state.currentFileNo - 1;
      return startLoading(state, index, state.documents[index]);
    }

    case UPDATE_CURRENT_DOCUMENT: {
      const { document } = action;
      const found = findDocumentIndex(state.documents, document);
      const index = found >= 0 ? found : state.currentFileNo;

      if (
        index === state.currentFileNo &&
        isSameLoadedDocument(state.currentDocument, document)
      ) {
        return state;
      }

      return startLoading(state, index, document);
    }

    case PATCH_CURRENT_DOCUMENT: {
      if (action.loadId !== state.loadId || !state.currentDocument) {
        return state;
      }
      return {
        ...state,
        currentDocument: { ...state.currentDocument, ...action.patch },
      };
    }

    case SET_RENDERER_RECT: {
      return { ...state, rendererRect: action.rect };
    }

    case SET_MAIN_CONFIG: {
      return { ...state, config: action.config };
    }

    case SYNC_PROPS: {
      return { ...state, ...action.props };
    }

    default:
      return state;
  }
};
