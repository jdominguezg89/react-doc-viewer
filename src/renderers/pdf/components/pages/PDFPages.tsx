import { type FC, useContext, useEffect, useState } from "react";
import { Document } from "react-pdf";
import { useTranslation } from "../../../../hooks/useTranslation";
import type { PdfDocumentOptions } from "../../../../models";
import { PDFContext } from "../../state";
import { setCurrentPage, setNumPages } from "../../state/actions";
import { initialPDFState } from "../../state/reducer";
import { PDFAllPages } from "./PDFAllPages";
import PDFSinglePage from "./PDFSinglePage";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  Object.getPrototypeOf(value) === Object.prototype;

const sameEntries = (
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  deep: boolean,
): boolean => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => {
      const left = a[key];
      const right = b[key];
      if (left === right) return true;
      // One level down, for values such as `httpHeaders: { ... }`.
      return (
        deep &&
        isPlainObject(left) &&
        isPlainObject(right) &&
        sameEntries(left, right, false)
      );
    })
  );
};

/** True when both option objects hold the same values. */
const sameOptions = (
  a: PdfDocumentOptions | undefined,
  b: PdfDocumentOptions | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return sameEntries(
    a as Record<string, unknown>,
    b as Record<string, unknown>,
    true,
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
  // contents are the same. (State, not a ref: a render that never commits
  // must not leave its value behind.)
  const [options, setOptions] = useState(pdfConfig?.documentOptions);
  if (!sameOptions(options, pdfConfig?.documentOptions)) {
    setOptions(pdfConfig?.documentOptions);
  }

  // Reset the page state when the file itself changes. Keyed on the data
  // react-pdf loads, not on the document object: that object is replaced
  // whenever the list or a file name changes, without a reload.
  const fileData = currentDocument?.fileData;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `fileData` is the trigger
  useEffect(() => {
    dispatch(setNumPages(initialPDFState.numPages));
    dispatch(setCurrentPage(initialPDFState.currentPage));
  }, [fileData, dispatch]);

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
