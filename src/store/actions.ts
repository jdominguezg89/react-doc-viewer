import type { IDocument } from "../models";

export const SET_ALL_DOCUMENTS = "SET_ALL_DOCUMENTS";
export const SET_DOCUMENT_LOADING = "SET_DOCUMENT_LOADING";
export const SET_DOCUMENT_ERROR = "SET_DOCUMENT_ERROR";
export const NEXT_DOCUMENT = "NEXT_DOCUMENT";
export const PREVIOUS_DOCUMENT = "PREVIOUS_DOCUMENT";
export const UPDATE_CURRENT_DOCUMENT = "UPDATE_CURRENT_DOCUMENT";
export const PATCH_CURRENT_DOCUMENT = "PATCH_CURRENT_DOCUMENT";
export const SET_RENDERER_RECT = "SET_RENDERER_RECT";

export interface SetAllDocuments {
  type: typeof SET_ALL_DOCUMENTS;
  documents: IDocument[];
  /** Controlled selection; wins over everything else. */
  activeDocument?: IDocument;
  /** Used when the currently shown document is no longer in the list. */
  initialActiveDocument?: IDocument;
}

export interface SetDocumentLoading {
  type: typeof SET_DOCUMENT_LOADING;
  value: boolean;
  /** Load this belongs to; ignored when the viewer has moved on. */
  loadId?: number;
}

export interface SetDocumentError {
  type: typeof SET_DOCUMENT_ERROR;
  error: Error | undefined;
  /** Load this belongs to; ignored when the viewer has moved on. */
  loadId?: number;
}

export interface SetRendererRect {
  type: typeof SET_RENDERER_RECT;
  rect: DOMRect;
}

export interface NextDocument {
  type: typeof NEXT_DOCUMENT;
}

/** Switches the viewer to another document (controlled mode). */
export interface UpdateCurrentDocument {
  type: typeof UPDATE_CURRENT_DOCUMENT;
  document: IDocument;
}

/**
 * Merges loader results (file type, file data) into the document that is
 * being loaded. Ignored when the viewer has moved on in the meantime.
 */
export interface PatchCurrentDocument {
  type: typeof PATCH_CURRENT_DOCUMENT;
  loadId: number;
  patch: Partial<Pick<IDocument, "fileType" | "fileData">>;
}

export interface PreviousDocument {
  type: typeof PREVIOUS_DOCUMENT;
}

export const setAllDocuments = (
  documents: IDocument[],
  selection: {
    activeDocument?: IDocument;
    initialActiveDocument?: IDocument;
  } = {},
): SetAllDocuments => ({
  type: SET_ALL_DOCUMENTS,
  documents,
  ...selection,
});

export const setDocumentLoading = (
  value: boolean,
  loadId?: number,
): SetDocumentLoading => ({
  type: SET_DOCUMENT_LOADING,
  value,
  loadId,
});

export const setDocumentError = (
  error: Error | undefined,
  loadId?: number,
): SetDocumentError => ({
  type: SET_DOCUMENT_ERROR,
  error,
  loadId,
});

export const nextDocument = (): NextDocument => ({ type: NEXT_DOCUMENT });

export const previousDocument = (): PreviousDocument => ({
  type: PREVIOUS_DOCUMENT,
});

export const updateCurrentDocument = (
  document: IDocument,
): UpdateCurrentDocument => ({ type: UPDATE_CURRENT_DOCUMENT, document });

export const patchCurrentDocument = (
  loadId: number,
  patch: PatchCurrentDocument["patch"],
): PatchCurrentDocument => ({ type: PATCH_CURRENT_DOCUMENT, loadId, patch });

export const setRendererRect = (rect: DOMRect): SetRendererRect => ({
  type: SET_RENDERER_RECT,
  rect,
});

export type MainStateActions =
  | SetAllDocuments
  | SetDocumentLoading
  | SetDocumentError
  | NextDocument
  | PreviousDocument
  | UpdateCurrentDocument
  | PatchCurrentDocument
  | SetRendererRect;
