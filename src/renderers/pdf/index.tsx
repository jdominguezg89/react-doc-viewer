import { pdfjs } from "react-pdf";
import type { DocRenderer } from "../..";
import PDFControls from "./components/PDFControls";
import PDFPages from "./components/pages/PDFPages";
import { PDFProvider } from "./state";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`,
).toString();

const PDFRenderer: DocRenderer = ({ mainState }) => {
  return (
    <PDFProvider mainState={mainState}>
      <div
        id="pdf-renderer"
        data-testid="pdf-renderer"
        className="rdv-pdf-renderer"
      >
        <PDFControls />
        <PDFPages />
      </div>
    </PDFProvider>
  );
};

export default PDFRenderer;

PDFRenderer.fileTypes = ["pdf", "application/pdf"];
PDFRenderer.weight = 0;
