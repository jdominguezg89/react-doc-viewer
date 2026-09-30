"use client";

import type { FC } from "react";
import { useTranslation } from "../hooks/useTranslation";
import type { IDocument } from "../models";
import { LinkButton } from "./common";

interface Props {
  document: IDocument | undefined;
  fileName: string;
  /** Shown instead of the generic "no renderer" message. */
  message?: string;
}

/** Message + download link shown when a document cannot be rendered inline. */
export const NoRendererFallback: FC<Props> = ({
  document,
  fileName,
  message,
}) => {
  const { t } = useTranslation();

  return (
    <div id="no-renderer" data-testid="no-renderer">
      {message ??
        t("noRendererMessage", { fileType: document?.fileType ?? "" })}
      <LinkButton
        id="no-renderer-download"
        className="rdv-no-renderer__download"
        href={document?.uri}
        download={fileName || true}
        rel="noopener noreferrer"
      >
        {t("downloadButtonLabel")}
      </LinkButton>
    </div>
  );
};
