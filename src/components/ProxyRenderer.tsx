"use client";

import { type FC, useCallback } from "react";
import { useDocumentLoader } from "../hooks/useDocumentLoader";
import { useTranslation } from "../hooks/useTranslation";
import { useWindowSize } from "../hooks/useWindowSize";
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
          role="status"
          aria-live="polite"
          aria-label={t("pdfPluginLoading")}
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
  const size = useWindowSize();
  const { t } = useTranslation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `size` is intentionally a dependency so the rect is re-measured on window resize
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) dispatch(setRendererRect(node.getBoundingClientRect()));
    },
    [size, dispatch],
  );

  const fileName = getFileName(
    currentDocument,
    config?.header?.retainURLParams || false,
  );

  return (
    <div
      id="proxy-renderer"
      data-testid="proxy-renderer"
      className="rdv-proxy-renderer"
      ref={containerRef}
    >
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
