import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import DocViewer, {
  configurePdfWorker,
  getDefaultPdfWorkerSource,
} from "../../index";
import { mockDocumentRoutes } from "../../test/helpers";

const { pdfjsMock } = vi.hoisted(() => ({
  pdfjsMock: { GlobalWorkerOptions: { workerSrc: "" }, version: "0.0.0-test" },
}));

vi.mock("react-pdf", () => {
  const { useEffect } = require("react") as typeof import("react");
  const Document = ({
    children,
    onLoadSuccess,
    className,
  }: {
    children?: ReactNode;
    onLoadSuccess?: (info: { numPages: number }) => void;
    className?: string;
  }) => {
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

beforeEach(() => {
  fetchMock.resetMocks();
  mockDocumentRoutes(routes);
  pdfjsMock.GlobalWorkerOptions.workerSrc = "";
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

    const toggle = screen.getByRole("button", {
      name: "Toggle between single page and continuous scroll",
    });
    act(() => toggle.click());
    expect(screen.getAllByTestId("mock-page")).toHaveLength(3);
    expect(
      screen.queryByRole("button", { name: "Next page" }),
    ).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
