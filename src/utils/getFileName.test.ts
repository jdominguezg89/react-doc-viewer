import { getFileName } from "./getFileName";

describe("getFileName", () => {
  it("prefers the explicit fileName", () => {
    expect(getFileName({ uri: "/a/b.pdf", fileName: "Report" }, false)).toBe(
      "Report",
    );
  });

  it("derives the name from the URI and drops query params by default", () => {
    expect(
      getFileName({ uri: "https://x.test/a/my%20file.pdf?v=2" }, false),
    ).toBe("my file.pdf");
    expect(
      getFileName({ uri: "https://x.test/a/my%20file.pdf?v=2" }, true),
    ).toBe("my file.pdf?v=2");
  });

  it("tolerates malformed URIs and missing documents", () => {
    expect(getFileName({ uri: "/bad/%E0%A4%A" }, false)).toBe("%E0%A4%A");
    expect(getFileName(undefined, false)).toBe("");
  });
});
