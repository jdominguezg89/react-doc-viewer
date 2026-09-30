"use client";

import { type FC, useContext } from "react";
import { DocViewerContext } from "../store/DocViewerProvider";
import { DocumentNav } from "./DocumentNav";
import { FileName } from "./FileName";

export const HeaderBar: FC = () => {
  const { state, previous, next } = useContext(DocViewerContext);
  const { config } = state;

  if (config?.header?.disableHeader) return null;

  const override = config?.header?.overrideComponent?.(state, previous, next);

  if (override) {
    return override;
  }

  return (
    <div id="header-bar" data-testid="header-bar" className="rdv-header-bar">
      <FileName />
      <DocumentNav />
    </div>
  );
};
