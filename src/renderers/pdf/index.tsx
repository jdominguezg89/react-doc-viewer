import { lazy, Suspense } from "react";
import { LoadingIcon } from "../../components/icons";
import type { DocRenderer } from "../../models";

/**
 * The PDF renderer body (and with it react-pdf + pdfjs-dist) is loaded on
 * demand, so consumers that never show a PDF never download pdf.js.
 */
const PDFRendererBody = lazy(() => import("./PDFRendererBody"));

const PDFRenderer: DocRenderer = (props) => (
  <Suspense
    fallback={
      <div className="rdv-loading" data-testid="pdf-renderer-loading">
        <div className="rdv-loading__icon">
          <LoadingIcon color="#444" size={40} />
        </div>
      </div>
    }
  >
    <PDFRendererBody {...props} />
  </Suspense>
);

export default PDFRenderer;

PDFRenderer.fileTypes = ["pdf", "application/pdf"];
PDFRenderer.weight = 0;
