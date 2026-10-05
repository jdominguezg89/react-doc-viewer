import { type FC, useEffect, useRef } from "react";
import { useDocumentLoader } from "../hooks/useDocumentLoader";
import { useTranslation } from "../hooks/useTranslation";
import type { DocRenderer, IConfig, IDocument } from "../models";
import { setRendererRect } from "../store/actions";
import type { IMainState } from "../store/mainStateReducer";
import { getFileName } from "../utils/getFileName";
import { LoadingIcon } from "./icons";
import { LoadingTimeout } from "./LoadingTimeout";
import { NoRendererFallback } from "./NoRendererFallback";

type ContentsProps = {
  documents: IDocument[];
  documentLoading: boolean | undefined;
  documentError: Error | undefined;
  config: IConfig | undefined;
  currentDocument: IDocument | undefined;
  fileName: string;
  CurrentRenderer: DocRenderer | null | undefined;
  state: IMainState;
  t: ReturnType<typeof useTranslation>["t"];
};

const Contents: FC<ContentsProps> = ({
  documents,
  documentLoading,
  documentError,
  config,
  currentDocument,
  fileName,
  CurrentRenderer,
  state,
  t,
}) => {
  if (!documents.length) {
    return <div id="no-documents" />;
  }

  if (documentError) {
    if (config?.errorRenderer?.overrideComponent) {
      const OverrideComponent = config.errorRenderer.overrideComponent;
      return (
        <OverrideComponent
          document={currentDocument}
          fileName={fileName}
          error={documentError}
        />
      );
    }

    return (
      <div
        id="load-error"
        data-testid="load-error"
        className="rdv-message"
        role="alert"
      >
        {t("loadErrorMessage")}
      </div>
    );
  }

  if (documentLoading) {
    if (config?.loadingRenderer?.overrideComponent) {
      const OverrideComponent = config.loadingRenderer.overrideComponent;
      return (
        <LoadingTimeout>
          <OverrideComponent document={currentDocument} fileName={fileName} />
        </LoadingTimeout>
      );
    }

    return (
      <LoadingTimeout>
        <div
          id="loading-renderer"
          data-testid="loading-renderer"
          className="rdv-loading"
        >
          <div className="rdv-loading__icon">
            <LoadingIcon color="#444" size={40} />
          </div>
        </div>
      </LoadingTimeout>
    );
  }

  if (CurrentRenderer) {
    return <CurrentRenderer mainState={state} />;
  }

  if (CurrentRenderer === undefined) {
    return null;
  }

  if (config?.noRenderer?.overrideComponent) {
    const OverrideComponent = config.noRenderer.overrideComponent;
    return <OverrideComponent document={currentDocument} fileName={fileName} />;
  }

  return <NoRendererFallback document={currentDocument} fileName={fileName} />;
};

export const ProxyRenderer: FC = () => {
  const { state, dispatch, CurrentRenderer } = useDocumentLoader();
  const { documents, documentLoading, documentError, currentDocument, config } =
    state;
  const { t } = useTranslation();

  // Measure the scroll area whenever its own size changes (window resizes,
  // but also sidebars and split panes), not only on window resize.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    let width = -1;
    let height = -1;
    const measure = () => {
      // The PDF toolbar is sized to the visible width (see styles.css).
      node.style.setProperty("--rdv-scrollport-width", `${node.clientWidth}px`);
      const rect = node.getBoundingClientRect();
      if (
        Math.abs(rect.width - width) < 1 &&
        Math.abs(rect.height - height) < 1
      ) {
        return;
      }
      width = rect.width;
      height = rect.height;
      dispatch(setRendererRect(rect));
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [dispatch]);

  const fileName = getFileName(
    currentDocument,
    config?.header?.retainURLParams || false,
  );

  // One always-mounted status line for assistive technology: live regions
  // only announce changes to content that is already in the DOM.
  let status = "";
  if (currentDocument && !documentError) {
    status = documentLoading
      ? t("pdfPluginLoading")
      : `${fileName} ${
          documents.length > 1
            ? t("documentNavInfo", {
                currentFileNo: state.currentFileNo + 1,
                allFilesCount: documents.length,
              })
            : ""
        }`.trim();
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: kept as a div so existing `#proxy-renderer` selectors keep working
    <div
      id="proxy-renderer"
      data-testid="proxy-renderer"
      className="rdv-proxy-renderer"
      ref={containerRef}
      // A named, focusable region: the scroll area must be reachable from
      // the keyboard even when the document has no focusable content.
      role="region"
      aria-label={fileName || undefined}
      tabIndex={currentDocument ? 0 : undefined}
    >
      <div className="rdv-visually-hidden" role="status">
        {status}
      </div>
      <Contents
        {...{
          state,
          documents,
          documentLoading,
          documentError,
          config,
          currentDocument,
          fileName,
          CurrentRenderer,
          t,
        }}
      />
    </div>
  );
};
