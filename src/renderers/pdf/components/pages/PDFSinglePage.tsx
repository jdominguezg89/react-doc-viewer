import { type FC, useContext } from "react";
import { Page } from "react-pdf";
import { useTranslation } from "../../../../hooks/useTranslation";
import { cx } from "../../../../utils/cx";
import { PDFContext } from "../../state";

interface Props {
  pageNum?: number;
}

const PDFSinglePage: FC<Props> = ({ pageNum }) => {
  const {
    state: { mainState, paginated, zoomLevel, numPages, currentPage },
  } = useContext(PDFContext);
  const { t } = useTranslation();

  const rendererRect = mainState?.rendererRect || null;

  const _pageNum = pageNum ?? currentPage;

  return (
    <div
      id="pdf-page-wrapper"
      className={cx(
        "rdv-pdf-page",
        _pageNum >= numPages && "rdv-pdf-page--last",
      )}
    >
      {!paginated && (
        <div id="pdf-page-info" className="rdv-pdf-page__tag">
          {t("pdfPluginPageNumber", {
            currentPage: _pageNum,
            allPagesCount: numPages,
          })}
        </div>
      )}
      <Page
        pageNumber={_pageNum || currentPage}
        scale={zoomLevel}
        height={(rendererRect?.height ?? 100) - 100}
        width={(rendererRect?.width ?? 100) - 100}
        loading={t("pdfPluginLoading")}
      />
    </div>
  );
};

export default PDFSinglePage;
