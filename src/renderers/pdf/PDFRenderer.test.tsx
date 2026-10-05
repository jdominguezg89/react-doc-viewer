import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import DocViewer, {
  configurePdfWorker,
  getDefaultPdfWorkerSource,
} from "../../index";
import { mockDocumentRoutes } from "../../test/helpers";

const { pdfjsMock, seenOptions } = vi.hoisted(() => ({
  pdfjsMock: { GlobalWorkerOptions: { workerSrc: "" }, version: "0.0.0-test" },
  // Every `options` object the mocked <Document> received; react-pdf reloads
  // the file whenever its identity changes.
  seenOptions: [] as unknown[],
}));

vi.mock("react-pdf", () => {
  const { useEffect } = require("react") as typeof import("react");
  const Document = ({
    children,
    onLoadSuccess,
    className,
    options,
  }: {
    children?: ReactNode;
    onLoadSuccess?: (info: { numPages: number }) => void;
    className?: string;
    options?: unknown;
  }) => {
    seenOptions.push(options);
    // Fire once per mount, like a real document load.
    useEffect(() => {
      // Real documents load asynchronously, after the parent's effects.
      const handle = setTimeout(() => onLoadSuccess?.({ numPages: 3 }), 0);
      return () => clearTimeout(handle);
    }, []);
    return (
      <div data-testid="mock-document" className={className}>
        {children}
      </div>
    );
  };
  const Page = ({
    pageNumber,
    scale,
  }: {
    pageNumber: number;
    scale?: number;
  }) => (
    <div data-testid="mock-page" data-page={pageNumber} data-scale={scale} />
  );
  return { Document, Page, pdfjs: pdfjsMock };
});

const routes = {
  "doc.pdf": { body: "%PDF-1.7", type: "application/pdf" },
};

// Load the lazy chunk up front so the first test does not race the default
// findBy timeout on a cold import.
beforeAll(async () => {
  await import("./PDFRendererBody");
});

beforeEach(() => {
  fetchMock.resetMocks();
  mockDocumentRoutes(routes);
  pdfjsMock.GlobalWorkerOptions.workerSrc = "";
  seenOptions.length = 0;
  configurePdfWorker();
});

describe("PDF renderer", () => {
  it("configures the bundled worker by default and renders pages", async () => {
    render(<DocViewer documents={[{ uri: "https://x.test/doc.pdf" }]} />);
    expect(await screen.findByTestId("pdf-renderer")).toBeInTheDocument();
    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toBe(
      getDefaultPdfWorkerSource(),
    );
    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toMatch(
      /pdf\.worker\.min\.mjs$/,
    );

    // paginated by default: one page, pagination visible
    expect(await screen.findByText("Page 1/3")).toBeInTheDocument();
    expect(screen.getAllByTestId("mock-page")).toHaveLength(1);
  });

  it("honours config.pdf.workerSrc and configurePdfWorker()", async () => {
    configurePdfWorker("https://cdn.test/global-worker.mjs");
    const { unmount } = render(
      <DocViewer documents={[{ uri: "https://x.test/doc.pdf" }]} />,
    );
    await screen.findByTestId("pdf-renderer");
    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toBe(
      "https://cdn.test/global-worker.mjs",
    );
    unmount();

    render(
      <DocViewer
        documents={[{ uri: "https://x.test/doc.pdf" }]}
        config={{
          pdf: { workerSrc: new URL("https://cdn.test/instance.mjs") },
        }}
      />,
    );
    await screen.findByTestId("pdf-renderer");
    expect(pdfjsMock.GlobalWorkerOptions.workerSrc).toBe(
      "https://cdn.test/instance.mjs",
    );
  });

  it("paginates, toggles continuous scroll and clamps zoom", async () => {
    render(
      <DocViewer
        documents={[{ uri: "https://x.test/doc.pdf" }]}
        config={{ pdfZoom: { defaultZoom: 1, zoomJump: 3 } }}
      />,
    );
    await screen.findByText("Page 1/3");

    const next = screen.getByRole("button", { name: "Next page" });
    const prev = screen.getByRole("button", { name: "Previous page" });
    expect(prev).toBeDisabled();
    act(() => next.click());
    expect(screen.getByText("Page 2/3")).toBeInTheDocument();
    expect(screen.getByTestId("mock-page")).toHaveAttribute("data-page", "2");

    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const reset = screen.getByRole("button", {
      name: "Reset to default zoom level",
    });
    expect(reset).toBeDisabled();
    act(() => zoomIn.click());
    act(() => zoomIn.click());
    expect(screen.getByTestId("mock-page")).toHaveAttribute("data-scale", "5");
    expect(reset).toBeEnabled();
    act(() => reset.click());
    expect(screen.getByTestId("mock-page")).toHaveAttribute("data-scale", "1");

    const toggle = screen.getByRole("button", { name: "Continuous scroll" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    act(() => toggle.click());
    expect(screen.getAllByTestId("mock-page")).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: "Next page" }),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the page and pagination when the documents list changes around the PDF", async () => {
    const pdf = { uri: "https://x.test/doc.pdf" };
    const { rerender } = render(<DocViewer documents={[pdf]} />);
    await screen.findByText("Page 1/3");
    act(() => screen.getByRole("button", { name: "Next page" }).click());
    expect(screen.getByText("Page 2/3")).toBeInTheDocument();

    // A second entry and a new file name for the PDF: same file, no reload.
    rerender(
      <DocViewer
        documents={[
          { ...pdf, fileName: "Renamed.pdf" },
          { uri: "https://x.test/other.pdf" },
        ]}
      />,
    );
    await screen.findByText("Document 1 of 2");
    expect(screen.getByText("Page 2/3")).toBeInTheDocument();
    expect(screen.getByTestId("mock-page")).toHaveAttribute("data-page", "2");
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("passes a stable options object for equal inline documentOptions", async () => {
    const Host = ({ cMapUrl, n }: { cMapUrl: string; n: number }) => (
      <DocViewer
        documents={[{ uri: "https://x.test/doc.pdf" }]}
        config={{
          pdf: { documentOptions: { cMapUrl, httpHeaders: { a: "b" } } },
        }}
        data-n={n}
      />
    );
    const { rerender } = render(<Host cMapUrl="/cmaps/" n={0} />);
    await screen.findByText("Page 1/3");
    for (let i = 1; i <= 3; i++) rerender(<Host cMapUrl="/cmaps/" n={i} />);
    expect(new Set(seenOptions).size).toBe(1);

    // A real change is passed on.
    rerender(<Host cMapUrl="/other/" n={4} />);
    expect(new Set(seenOptions).size).toBe(2);
    expect(seenOptions.at(-1)).toMatchObject({ cMapUrl: "/other/" });
  });
});
