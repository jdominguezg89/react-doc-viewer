import { type FC, useContext, useEffect, useMemo } from "react";
import { Document, type DocumentProps } from "react-pdf";
import { useTranslation } from "../../../../hooks/useTranslation";
import { PDFContext } from "../../state";
import { setCurrentPage, setNumPages } from "../../state/actions";
import { initialPDFState } from "../../state/reducer";
import { PDFAllPages } from "./PDFAllPages";
import PDFSinglePage from "./PDFSinglePage";

type DocumentOptions = NonNullable<DocumentProps["options"]>;

/** Library defaults for pdf.js `getDocument`; `config.pdf.documentOptions` is merged over them. */
const defaultDocumentOptions: DocumentOptions = {};

const PDFPages: FC = () => {
  const {
    state: { mainState, paginated },
    dispatch,
  } = useContext(PDFContext);
  const { t } = useTranslation();

  const currentDocument = mainState?.currentDocument || null;
  const pdfConfig = mainState?.config?.pdf;

  // react-pdf reloads the document whenever `options` changes identity.
  const options = useMemo<DocumentOptions>(
    () => ({ ...defaultDocumentOptions, ...pdfConfig?.documentOptions }),
    [pdfConfig?.documentOptions],
  );

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
