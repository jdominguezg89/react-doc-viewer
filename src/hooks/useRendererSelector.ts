import { useContext, useEffect, useState } from "react";
import type { DocRenderer } from "../models";
import { DocViewerContext } from "../store/DocViewerProvider";
import { normalizeFileType } from "../utils/fileType";

/**
 * Picks the renderer for the current document.
 * `undefined` = not decided yet (file type unknown), `null` = no renderer.
 */
export const selectRenderer = (
  fileType: string | undefined,
  renderers: DocRenderer[] | undefined,
): DocRenderer | null | undefined => {
  const normalized = normalizeFileType(fileType);
  if (!normalized) return undefined;

  const matching = (renderers ?? []).filter((renderer) =>
    renderer.fileTypes.some((type) => type.toLowerCase() === normalized),
  );
  if (!matching.length) return null;

  return matching.reduce((best, candidate) =>
    candidate.weight > best.weight ? candidate : best,
  );
};

export const useRendererSelector = (): {
  CurrentRenderer: DocRenderer | null | undefined;
} => {
  const {
    state: { currentDocument, pluginRenderers },
  } = useContext(DocViewerContext);

  const [CurrentRenderer, setCurrentRenderer] = useState<
    DocRenderer | null | undefined
  >();

  useEffect(() => {
    if (!currentDocument) return;
    const selected = selectRenderer(currentDocument.fileType, pluginRenderers);
    setCurrentRenderer(() => selected);
  }, [currentDocument, pluginRenderers]);

  return { CurrentRenderer };
};
