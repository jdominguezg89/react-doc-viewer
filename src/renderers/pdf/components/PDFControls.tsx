import { type FC, useContext } from "react";
import { Button, LinkButton } from "../../../components/Button";
import { useTranslation } from "../../../hooks/useTranslation";
import { getFileName } from "../../../utils/getFileName";
import { PDFContext } from "../state";
import { setPDFPaginated, setZoomLevel } from "../state/actions";
import {
  DownloadPDFIcon,
  ResetZoomPDFIcon,
  TogglePaginationPDFIcon,
  ZoomInPDFIcon,
  ZoomOutPDFIcon,
} from "./icons";
import PDFPagination from "./PDFPagination";

const PDFControls: FC = () => {
  const { t } = useTranslation();
  const {
    state: {
      mainState,
      paginated,
      zoomLevel,
      numPages,
      zoomJump,
      defaultZoomLevel,
    },
    dispatch,
  } = useContext(PDFContext);

  const currentDocument = mainState?.currentDocument || null;

  return (
    <div id="pdf-controls" className="rdv-pdf-controls">
      {paginated && numPages > 1 && <PDFPagination />}

      {currentDocument?.fileData && (
        <LinkButton
          id="pdf-download"
          className="rdv-pdf-controls__button"
          href={currentDocument?.fileData as string}
          download={getFileName(currentDocument ?? undefined, false) || true}
          aria-label={t("downloadButtonLabel")}
          title={t("downloadButtonLabel")}
        >
          <DownloadPDFIcon size="75%" />
        </LinkButton>
      )}

      <Button
        id="pdf-zoom-out"
        className="rdv-pdf-controls__button"
        aria-label={t("pdfZoomOutLabel")}
        title={t("pdfZoomOutLabel")}
        onClick={() => dispatch(setZoomLevel(zoomLevel - zoomJump))}
      >
        <ZoomOutPDFIcon size="80%" />
      </Button>

      <Button
        id="pdf-zoom-in"
        className="rdv-pdf-controls__button"
        aria-label={t("pdfZoomInLabel")}
        title={t("pdfZoomInLabel")}
        onClick={() => dispatch(setZoomLevel(zoomLevel + zoomJump))}
      >
        <ZoomInPDFIcon size="80%" />
      </Button>

      <Button
        id="pdf-zoom-reset"
        className="rdv-pdf-controls__button"
        aria-label={t("pdfZoomResetLabel")}
        title={t("pdfZoomResetLabel")}
        onClick={() => dispatch(setZoomLevel(defaultZoomLevel))}
        disabled={Math.abs(zoomLevel - defaultZoomLevel) < 0.001}
      >
        <ResetZoomPDFIcon size="70%" />
      </Button>

      {numPages > 1 && (
        <Button
          id="pdf-toggle-pagination"
          className="rdv-pdf-controls__button"
          aria-label={t("pdfTogglePaginationLabel")}
          title={t("pdfTogglePaginationLabel")}
          aria-pressed={!paginated}
          onClick={() => dispatch(setPDFPaginated(!paginated))}
        >
          <TogglePaginationPDFIcon size="70%" reverse={paginated} />
        </Button>
      )}
    </div>
  );
};

export default PDFControls;
