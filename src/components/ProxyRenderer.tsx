"use client";

import { type FC, useCallback } from "react";
import { useDocumentLoader } from "../hooks/useDocumentLoader";
import { useTranslation } from "../hooks/useTranslation";
import { useWindowSize } from "../hooks/useWindowSize";
import type { DocRenderer, IConfig, IDocument } from "../models";
import { setRendererRect } from "../store/actions";
import type { IMainState } from "../store/mainStateReducer";
import { getFileName } from "../utils/getFileName";
import { LinkButton } from "./common";
import { LoadingIcon } from "./icons";
import { LoadingTimeout } from "./LoadingTimout";

type ContentsProps = {
  documents: IDocument[];
  documentLoading: boolean | undefined;
  config: IConfig | undefined;
  currentDocument: IDocument | undefined;
  fileName: string;
  CurrentRenderer: DocRenderer | null | undefined;
  state: IMainState;
  t: (
    key:
      | "noRendererMessage"
      | "documentNavInfo"
      | "downloadButtonLabel"
      | "brokenFile"
      | "msgPluginRecipients"
      | "msgPluginSender"
      | "pdfPluginLoading"
      | "pdfPluginPageNumber",
    variables?: Record<string, string | number>,
  ) => string;
};

const Contents: React.FC<ContentsProps> = ({
  documents,
  documentLoading,
  config,
  currentDocument,
  fileName,
  CurrentRenderer,
  state,
  t,
}) => {
  if (!documents.length) {
    return <div id="no-documents"></div>;
  } else if (documentLoading) {
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
  } else {
    if (CurrentRenderer) {
      return <CurrentRenderer mainState={state} />;
    } else if (CurrentRenderer === undefined) {
      return null;
    } else {
      if (config?.noRenderer?.overrideComponent) {
        const OverrideComponent = config.noRenderer.overrideComponent;
        return (
          <OverrideComponent document={currentDocument} fileName={fileName} />
        );
      }

      return (
        <div id="no-renderer" data-testid="no-renderer">
          {t("noRendererMessage", {
            fileType: currentDocument?.fileType ?? "",
          })}
          <LinkButton
            id="no-renderer-download"
            className="rdv-no-renderer__download"
            href={currentDocument?.uri}
            download={currentDocument?.uri}
          >
            {t("downloadButtonLabel")}
          </LinkButton>
        </div>
      );
    }
  }
};

export const ProxyRenderer: FC = () => {
  const { state, dispatch, CurrentRenderer } = useDocumentLoader();
  const { documents, documentLoading, currentDocument, config } = state;
  const size = useWindowSize();
  const { t } = useTranslation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `size` is intentionally a dependency so the rect is re-measured on window resize
  const containerRef = useCallback(
    (node: HTMLDivElement) => {
      node && dispatch(setRendererRect(node?.getBoundingClientRect()));
    },
    [size, dispatch],
  );

  const fileName = getFileName(
    currentDocument,
    config?.header?.retainURLParams || false,
  );

  return (
    <div id="proxy-renderer" data-testid="proxy-renderer" ref={containerRef}>
      <Contents
        {...{
          state,
          documents,
          documentLoading,
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
