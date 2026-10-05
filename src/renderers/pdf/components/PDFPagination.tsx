import { type FC, useContext } from "react";
import { Button } from "../../../components/Button";
import { useTranslation } from "../../../hooks/useTranslation";
import { PDFContext } from "../state";
import { setCurrentPage } from "../state/actions";
import { NextPDFNavIcon, PrevPDFNavIcon } from "./icons";

const PDFPagination: FC = () => {
  const {
    state: { currentPage, numPages },
    dispatch,
  } = useContext(PDFContext);
  const { t } = useTranslation();

  return (
    <div id="pdf-pagination" className="rdv-pdf-pagination">
      <Button
        id="pdf-pagination-prev"
        className="rdv-pdf-pagination__prev"
        aria-label={t("pdfPreviousPageLabel")}
        title={t("pdfPreviousPageLabel")}
        onClick={() => dispatch(setCurrentPage(currentPage - 1))}
        disabled={currentPage === 1}
      >
        <PrevPDFNavIcon size="50%" />
      </Button>

      <div
        id="pdf-pagination-info"
        className="rdv-pdf-pagination__info"
        aria-live="polite"
      >
        {t("pdfPluginPageNumber", {
          currentPage,
          allPagesCount: numPages,
        })}
      </div>

      <Button
        id="pdf-pagination-next"
        className="rdv-pdf-pagination__next"
        aria-label={t("pdfNextPageLabel")}
        title={t("pdfNextPageLabel")}
        onClick={() => dispatch(setCurrentPage(currentPage + 1))}
        disabled={currentPage >= numPages}
      >
        <NextPDFNavIcon size="50%" />
      </Button>
    </div>
  );
};

export default PDFPagination;
