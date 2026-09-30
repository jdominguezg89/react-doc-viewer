import {
  nextDocument,
  previousDocument,
  setAllDocuments,
  setDocumentError,
  setDocumentLoading,
  syncProps,
  updateCurrentDocument,
} from "./actions";
import {
  findDocumentIndex,
  initialState,
  mainStateReducer,
} from "./mainStateReducer";

const docs = [{ uri: "/a.pdf" }, { uri: "/b.png" }, { uri: "/c.csv" }];

describe("mainStateReducer", () => {
  it("sets documents and selects the initial one by reference or uri", () => {
    const byRef = mainStateReducer(
      initialState,
      setAllDocuments(docs, docs[2]),
    );
    expect(byRef.currentFileNo).toBe(2);
    expect(byRef.currentDocument).toBe(docs[2]);
    expect(byRef.documentLoading).toBe(true);

    const byUri = mainStateReducer(
      initialState,
      setAllDocuments(docs, { uri: "/b.png" }),
    );
    expect(byUri.currentFileNo).toBe(1);

    const unknown = mainStateReducer(
      initialState,
      setAllDocuments(docs, { uri: "/missing" }),
    );
    expect(unknown.currentFileNo).toBe(0);
  });

  it("navigates within bounds and resets loading/error", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    state = mainStateReducer(state, setDocumentError(new Error("x")));
    expect(state.documentLoading).toBe(false);

    state = mainStateReducer(state, nextDocument());
    expect(state.currentFileNo).toBe(1);
    expect(state.documentLoading).toBe(true);
    expect(state.documentError).toBeUndefined();

    state = mainStateReducer(state, nextDocument());
    state = mainStateReducer(state, nextDocument());
    expect(state.currentFileNo).toBe(2);

    state = mainStateReducer(state, previousDocument());
    state = mainStateReducer(state, previousDocument());
    state = mainStateReducer(state, previousDocument());
    expect(state.currentFileNo).toBe(0);
  });

  it("updates the current document in place without toggling loading", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    state = mainStateReducer(state, setDocumentLoading(false));
    state = mainStateReducer(
      state,
      updateCurrentDocument({ uri: "/a.pdf", fileType: "pdf" }),
    );
    expect(state.currentFileNo).toBe(0);
    expect(state.currentDocument?.fileType).toBe("pdf");
    expect(state.documentLoading).toBe(false);
  });

  it("switching to another document via update enters the loading state", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    state = mainStateReducer(state, setDocumentLoading(false));
    state = mainStateReducer(state, updateCurrentDocument(docs[1]));
    expect(state.currentFileNo).toBe(1);
    expect(state.documentLoading).toBe(true);
  });

  it("syncs props", () => {
    const state = mainStateReducer(
      initialState,
      syncProps({ language: "pl", requestHeaders: { a: "b" } }),
    );
    expect(state.language).toBe("pl");
    expect(state.requestHeaders).toEqual({ a: "b" });
  });
});

describe("findDocumentIndex", () => {
  it("returns -1 for unknown documents", () => {
    expect(findDocumentIndex(docs, undefined)).toBe(-1);
    expect(findDocumentIndex(docs, { uri: "/zzz" })).toBe(-1);
  });
});
