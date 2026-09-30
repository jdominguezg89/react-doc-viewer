import {
  setCurrentPage,
  setNumPages,
  setPDFPaginated,
  setZoomLevel,
} from "./actions";
import {
  clampZoom,
  initialPDFState,
  MAX_ZOOM,
  MIN_ZOOM,
  reducer,
} from "./reducer";

describe("pdf reducer", () => {
  it("clamps and rounds zoom", () => {
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1.1 + 0.1 + 0.1)).toBe(1.3);
    expect(reducer(initialPDFState, setZoomLevel(-3)).zoomLevel).toBe(MIN_ZOOM);
  });

  it("handles pagination and page state", () => {
    let state = reducer(initialPDFState, setNumPages(4));
    state = reducer(state, setCurrentPage(3));
    state = reducer(state, setPDFPaginated(false));
    expect(state).toMatchObject({
      numPages: 4,
      currentPage: 3,
      paginated: false,
    });
  });
});
