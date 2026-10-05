import type { IMainState } from "../../../store/mainStateReducer";
import {
  type PDFActions,
  SET_CURRENT_PAGE,
  SET_NUM_PAGES,
  SET_PDF_PAGINATED,
  SET_ZOOM_LEVEL,
} from "./actions";

export type IPDFState = {
  defaultZoomLevel: number;
  zoomLevel: number;
  zoomJump: number;
  paginated: boolean;
  numPages: number;
  currentPage: number;
  /** The viewer state, provided by PDFProvider on every render. */
  mainState?: IMainState;
};

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 5;

/** Clamps and rounds a zoom level to avoid float drift. */
export const clampZoom = (value: number): number =>
  Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;

export const initialPDFState: IPDFState = {
  defaultZoomLevel: 1,
  zoomLevel: 1,
  zoomJump: 0.1,
  paginated: true,
  numPages: 0,
  currentPage: 1,
};

export const reducer = (
  state: IPDFState = initialPDFState,
  action: PDFActions,
): IPDFState => {
  switch (action.type) {
    case SET_ZOOM_LEVEL:
      return { ...state, zoomLevel: clampZoom(action.value) };
    case SET_PDF_PAGINATED:
      return { ...state, paginated: action.value };
    case SET_NUM_PAGES:
      return { ...state, numPages: action.value };
    case SET_CURRENT_PAGE:
      return { ...state, currentPage: action.value };
    default:
      return state;
  }
};
