import { type AvailableLanguages, defaultLanguage } from "../i18n";
import type { DocRenderer, IConfig, IDocument } from "../models";
import {
  type MainStateActions,
  NEXT_DOCUMENT,
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

export const mainStateReducer: MainStateReducer = (
  state = initialState,
  action: MainStateActions,
): IMainState => {
  switch (action.type) {
    case SET_ALL_DOCUMENTS: {
      const { documents, initialActiveDocument } = action;
      const index = Math.max(
        findDocumentIndex(documents, initialActiveDocument),
        0,
      );

      return {
        ...state,
        documents,
        currentDocument: documents[index],
        currentFileNo: index,
        documentLoading: documents.length > 0,
        documentError: undefined,
      };
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
      const nextDocumentNo = state.currentFileNo + 1;

      return {
        ...state,
        currentFileNo: nextDocumentNo,
        currentDocument: state.documents[nextDocumentNo],
        documentLoading: true,
        documentError: undefined,
      };
    }

    case PREVIOUS_DOCUMENT: {
      if (state.currentFileNo <= 0) return state;
      const prevDocumentNo = state.currentFileNo - 1;

      return {
        ...state,
        currentFileNo: prevDocumentNo,
        currentDocument: state.documents[prevDocumentNo],
        documentLoading: true,
        documentError: undefined,
      };
    }

    case UPDATE_CURRENT_DOCUMENT: {
      const { document } = action;
      const index = findDocumentIndex(state.documents, document);
      const changed = document.uri !== state.currentDocument?.uri;

      return {
        ...state,
        currentDocument: document,
        currentFileNo: index >= 0 ? index : state.currentFileNo,
        documentLoading: changed ? true : state.documentLoading,
        documentError: changed ? undefined : state.documentError,
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
