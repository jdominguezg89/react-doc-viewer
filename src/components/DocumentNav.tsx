"use client";

import { type FC, useContext } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { nextDocument, previousDocument } from "../store/actions";
import { DocViewerContext } from "../store/DocViewerProvider";
import { Button } from "./common/Button";
import { NextDocIcon, PrevDocIcon } from "./icons";

export const DocumentNav: FC = () => {
  const {
    state: { currentDocument, currentFileNo, documents },
    dispatch,
  } = useContext(DocViewerContext);
  const { t } = useTranslation();

  if (documents.length <= 1 || !currentDocument) return null;

  return (
    <div id="doc-nav" className="rdv-doc-nav">
      <p id="doc-nav-info">
        {t("documentNavInfo", {
          currentFileNo: currentFileNo + 1,
          allFilesCount: documents.length,
        })}
      </p>

      <Button
        variant="secondary"
        id="doc-nav-prev"
        className="rdv-doc-nav__prev"
        onClick={() => dispatch(previousDocument())}
        disabled={currentFileNo === 0}
      >
        <PrevDocIcon color="#fff" size="60%" />
      </Button>

      <Button
        variant="secondary"
        id="doc-nav-next"
        className="rdv-doc-nav__next"
        onClick={() => dispatch(nextDocument())}
        disabled={currentFileNo >= documents.length - 1}
      >
        <NextDocIcon color="#fff" size="60%" />
      </Button>
    </div>
  );
};
