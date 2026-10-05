import type { FC } from "react";
import { pdfjs } from "react-pdf";
import type { DocRendererProps } from "../../models";
import PDFControls from "./components/PDFControls";
import PDFPages from "./components/pages/PDFPages";
import { PDFProvider } from "./state";
import { resolvePdfWorkerSource } from "./worker";

const PDFRendererBody: FC<DocRendererProps> = ({ mainState }) => {
  const workerSrc = resolvePdfWorkerSource(mainState.config?.pdf?.workerSrc);
  if (pdfjs.GlobalWorkerOptions.workerSrc !== workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  }

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

export default PDFRendererBody;
