import { render, screen } from "@testing-library/react";
import csvFile from "../exampleFiles/csv-file.csv?url";
import gifFile from "../exampleFiles/gif-image.gif?url";
import pdfFile from "../exampleFiles/pdf-file.pdf?url";
import pngFile from "../exampleFiles/png-image.png?url";
import DocViewer from "../index";

beforeEach(() => {
  fetchMock.resetMocks();
  fetchMock.mockResponse("", { headers: { "content-type": "image/png" } });
});

test("renders component with no documents", () => {
  render(<DocViewer documents={[]} />);

  expect(screen.getByTestId("react-doc-viewer")).toBeDefined();
});

test("renders component with documents", () => {
  const docs = [
    { uri: pdfFile },
    { uri: pngFile },
    { uri: csvFile },
    { uri: gifFile },
  ];

  render(<DocViewer documents={docs} />);

  expect(screen.getByTestId("react-doc-viewer")).toBeDefined();
  expect(screen.getByText(`Document 1 of ${docs.length}`)).toBeDefined();
});

test("renders component with unsupported file type", async () => {
  const docs = [{ uri: "", fileType: "application/postscript" }];
  render(<DocViewer documents={docs} />);

  expect(screen.getByTestId("react-doc-viewer")).toBeDefined();

  expect(
    await screen.findByText(
      "No renderer for file type: application/postscript",
    ),
  ).toBeInTheDocument();
});

test("renders doc viewer with initialActiveDocument prop", async () => {
  const docs = [{ uri: pdfFile }, { uri: pngFile }];
  render(<DocViewer documents={docs} initialActiveDocument={docs[1]} />);

  const proxyRenderer = screen.getByTestId("proxy-renderer");

  expect(screen.getByTestId("react-doc-viewer")).toBeDefined();
  expect(screen.getByText(`Document 2 of ${docs.length}`)).toBeDefined();
  expect(proxyRenderer).toBeDefined();
  expect(await screen.findByRole("img")).toBeInTheDocument();
});
