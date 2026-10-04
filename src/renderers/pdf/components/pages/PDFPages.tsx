import { type FC, useContext, useEffect, useRef } from "react";
import { Document } from "react-pdf";
import { useTranslation } from "../../../../hooks/useTranslation";
import type { PdfDocumentOptions } from "../../../../models";
import { PDFContext } from "../../state";
import { setCurrentPage, setNumPages } from "../../state/actions";
import { initialPDFState } from "../../state/reducer";
import { PDFAllPages } from "./PDFAllPages";
import PDFSinglePage from "./PDFSinglePage";

/** True when both option objects have the same own keys and values. */
const sameOptions = (
  a: PdfDocumentOptions | undefined,
  b: PdfDocumentOptions | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a) as Array<keyof PdfDocumentOptions>;
  return (
    keysA.length === Object.keys(b).length &&
    keysA.every((key) => a[key] === b[key])
  );
};

const PDFPages: FC = () => {
  const {
    state: { mainState, paginated },
    dispatch,
  } = useContext(PDFContext);
  const { t } = useTranslation();

  const currentDocument = mainState?.currentDocument || null;
  const pdfConfig = mainState?.config?.pdf;

  // react-pdf reloads the document whenever `options` changes identity, and
  // `config` is often an inline object: keep the previous reference while the
  // contents are the same.
  const optionsRef = useRef(pdfConfig?.documentOptions);
  if (!sameOptions(optionsRef.current, pdfConfig?.documentOptions)) {
    optionsRef.current = pdfConfig?.documentOptions;
  }
  const options = optionsRef.current;

  // biome-ignore lint/correctness/useExhaustiveDependencies: page count must reset whenever the document changes
  useEffect(() => {
    dispatch(setNumPages(initialPDFState.numPages));
    dispatch(setCurrentPage(initialPDFState.currentPage));
  }, [currentDocument, dispatch]);

  if (!currentDocument || currentDocument.fileData === undefined) return null;

  return (
    <Document
      className="rdv-pdf-document"
      file={currentDocument.fileData}
      options={options}
      suspense={false}
      externalLinkTarget={pdfConfig?.externalLinkTarget ?? "_blank"}
      externalLinkRel="noopener noreferrer"
      onLoadSuccess={({ numPages }) => dispatch(setNumPages(numPages))}
      onLoadError={pdfConfig?.onLoadError}
      loading={<span>{t("pdfPluginLoading")}</span>}
      error={<span>{t("brokenFile")}</span>}
    >
      {paginated ? <PDFSinglePage /> : <PDFAllPages />}
    </Document>
  );
};

export default PDFPages;
