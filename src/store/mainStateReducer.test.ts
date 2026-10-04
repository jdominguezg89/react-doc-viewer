import {
  nextDocument,
  patchCurrentDocument,
  previousDocument,
  setAllDocuments,
  setDocumentError,
  setDocumentLoading,
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
      setAllDocuments(docs, { initialActiveDocument: docs[2] }),
    );
    expect(byRef.currentFileNo).toBe(2);
    expect(byRef.currentDocument).toBe(docs[2]);
    expect(byRef.documentLoading).toBe(true);

    const byUri = mainStateReducer(
      initialState,
      setAllDocuments(docs, { initialActiveDocument: { uri: "/b.png" } }),
    );
    expect(byUri.currentFileNo).toBe(1);

    const unknown = mainStateReducer(
      initialState,
      setAllDocuments(docs, { initialActiveDocument: { uri: "/missing" } }),
    );
    expect(unknown.currentFileNo).toBe(0);
  });

  it("navigates within bounds, resets loading/error and bumps loadId", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    state = mainStateReducer(state, setDocumentError(new Error("x")));
    expect(state.documentLoading).toBe(false);
    const before = state.loadId;

    state = mainStateReducer(state, nextDocument());
    expect(state.currentFileNo).toBe(1);
    expect(state.documentLoading).toBe(true);
    expect(state.documentError).toBeUndefined();
    expect(state.loadId).toBe(before + 1);

    state = mainStateReducer(state, nextDocument());
    state = mainStateReducer(state, nextDocument());
    expect(state.currentFileNo).toBe(2);

    state = mainStateReducer(state, previousDocument());
    state = mainStateReducer(state, previousDocument());
    state = mainStateReducer(state, previousDocument());
    expect(state.currentFileNo).toBe(0);
  });

  it("patches loader results into the current document and drops stale ones", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    state = mainStateReducer(state, setDocumentLoading(false));

    const patched = mainStateReducer(
      state,
      patchCurrentDocument(state.loadId, { fileType: "pdf", fileData: "data" }),
    );
    expect(patched.currentDocument).toEqual({
      uri: "/a.pdf",
      fileType: "pdf",
      fileData: "data",
    });
    expect(patched.currentFileNo).toBe(0);
    expect(patched.documentLoading).toBe(false);

    const stale = mainStateReducer(
      state,
      patchCurrentDocument(state.loadId - 1, { fileType: "png" }),
    );
    expect(stale).toBe(state);
  });

  it("keeps the loaded document when the list changes around it", () => {
    let state = mainStateReducer(
      initialState,
      setAllDocuments([{ uri: "/a.txt", fileType: "txt" }]),
    );
    state = mainStateReducer(
      state,
      patchCurrentDocument(state.loadId, { fileData: "hello" }),
    );
    state = mainStateReducer(state, setDocumentLoading(false));
    const { loadId } = state;

    // append, rename: same document stays loaded, nothing reloads
    state = mainStateReducer(
      state,
      setAllDocuments([
        { uri: "/a.txt", fileType: "txt", fileName: "Renamed" },
        { uri: "/b.txt", fileType: "txt" },
      ]),
    );
    expect(state.loadId).toBe(loadId);
    expect(state.documentLoading).toBe(false);
    expect(state.currentDocument).toMatchObject({
      fileData: "hello",
      fileName: "Renamed",
    });

    // the shown document moves: the viewer follows it
    state = mainStateReducer(
      state,
      setAllDocuments([{ uri: "/z.txt" }, { uri: "/a.txt", fileType: "txt" }]),
    );
    expect(state.currentFileNo).toBe(1);
    expect(state.loadId).toBe(loadId);

    // the shown document disappears: start over with the first one
    state = mainStateReducer(state, setAllDocuments([{ uri: "/z.txt" }]));
    expect(state.currentFileNo).toBe(0);
    expect(state.documentLoading).toBe(true);
    expect(state.loadId).toBe(loadId + 1);
  });

  it("reloads when inline fileData changes for the same uri", () => {
    let state = mainStateReducer(
      initialState,
      setAllDocuments([{ uri: "", fileType: "x", fileData: "ONE" }]),
    );
    const { loadId } = state;
    state = mainStateReducer(
      state,
      setAllDocuments([{ uri: "", fileType: "x", fileData: "TWO" }]),
    );
    expect(state.currentDocument?.fileData).toBe("TWO");
    expect(state.loadId).toBe(loadId + 1);
  });

  it("switches documents in controlled mode and ignores no-op updates", () => {
    const twins = [
      { uri: "/same.pdf", fileName: "first" },
      { uri: "/same.pdf", fileName: "second" },
    ];
    let state = mainStateReducer(initialState, setAllDocuments(twins));
    state = mainStateReducer(state, setDocumentLoading(false));

    expect(mainStateReducer(state, updateCurrentDocument(twins[0]))).toBe(
      state,
    );

    const switched = mainStateReducer(state, updateCurrentDocument(twins[1]));
    expect(switched.currentFileNo).toBe(1);
    expect(switched.documentLoading).toBe(true);
    expect(switched.loadId).toBe(state.loadId + 1);

    // same-uri navigation also reloads
    const navigated = mainStateReducer(state, nextDocument());
    expect(navigated.currentDocument?.fileName).toBe("second");
    expect(navigated.loadId).toBe(state.loadId + 1);
  });

  it("ignores loading and error results of a previous load", () => {
    let state = mainStateReducer(initialState, setAllDocuments(docs));
    const stale = state.loadId;
    state = mainStateReducer(state, nextDocument());
    expect(mainStateReducer(state, setDocumentLoading(false, stale))).toBe(
      state,
    );
    expect(
      mainStateReducer(state, setDocumentError(new Error("x"), stale)),
    ).toBe(state);
    expect(
      mainStateReducer(state, setDocumentLoading(false, state.loadId))
        .documentLoading,
    ).toBe(false);
  });
});

describe("findDocumentIndex", () => {
  it("returns -1 for unknown documents", () => {
    expect(findDocumentIndex(docs, undefined)).toBe(-1);
    expect(findDocumentIndex(docs, { uri: "/zzz" })).toBe(-1);
  });
});
