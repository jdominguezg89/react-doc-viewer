import { useContext, useMemo } from "react";
import type { DocRenderer } from "../models";
import { DocViewerContext } from "../store/DocViewerProvider";
import { normalizeFileType } from "../utils/fileType";

/**
 * Picks the renderer for a file type.
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

/**
 * The renderer for the current document, derived synchronously so it can
 * never belong to the previously shown document.
 */
export const useRendererSelector = (): {
  CurrentRenderer: DocRenderer | null | undefined;
} => {
  const {
    state: { currentDocument, pluginRenderers },
  } = useContext(DocViewerContext);

  const hasDocument = currentDocument !== undefined;
  const fileType = currentDocument?.fileType;

  const CurrentRenderer = useMemo(
    () => (hasDocument ? selectRenderer(fileType, pluginRenderers) : undefined),
    [hasDocument, fileType, pluginRenderers],
  );

  return { CurrentRenderer };
};
