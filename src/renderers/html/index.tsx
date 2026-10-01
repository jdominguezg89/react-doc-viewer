import { useMemo } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import type { DocRenderer } from "../../models";
import { dataURLFileLoader } from "../../utils/fileLoaders";
import { getFileName } from "../../utils/getFileName";

// The renderer was already chosen, so any media type is accepted here (an
// .html file served as application/octet-stream still decodes).
const DATA_URL_PREFIX =
  /^data:[^;,]*(?:;\s*charset="?([^;,"]*)"?)?(;base64)?,/i;

/** Decodes the HTML renderer's data URL into a string. */
export const decodeHtmlDataUrl = (dataUrl: string): string => {
  let charset = "utf-8";
  let base64 = false;
  const payload = dataUrl.replace(DATA_URL_PREFIX, (_, cs, b64) => {
    if (cs) charset = cs;
    base64 = Boolean(b64);
    return "";
  });
  if (!base64) return decodeURIComponent(payload);
  const binary = window.atob(payload);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    // Unknown charset label.
    return new TextDecoder().decode(bytes);
  }
};

const HTMLRenderer: DocRenderer = ({
  mainState: { currentDocument, config },
}) => {
  const { t } = useTranslation();

  const decoded = useMemo(() => {
    const data = currentDocument?.fileData;
    if (typeof data !== "string") return { html: "", failed: false };
    try {
      return { html: decodeHtmlDataUrl(data), failed: false };
    } catch {
      return { html: "", failed: true };
    }
  }, [currentDocument]);

  if (decoded.failed) {
    return (
      <div id="html-renderer" className="rdv-html-renderer">
        <div role="alert">{t("brokenFile")}</div>
      </div>
    );
  }

  // `srcDoc` works with a fully sandboxed frame; the document gets an opaque
  // origin and cannot run scripts unless the consumer relaxes `sandbox`.
  return (
    <div id="html-renderer" className="rdv-html-renderer">
      <iframe
        id="html-body"
        className="rdv-html-renderer__frame"
        title={getFileName(currentDocument, false) || "HTML"}
        sandbox={config?.html?.sandbox ?? ""}
        srcDoc={decoded.html}
      />
    </div>
  );
};

export default HTMLRenderer;

HTMLRenderer.fileTypes = ["htm", "html", "text/htm", "text/html"];
HTMLRenderer.weight = 0;
HTMLRenderer.fileLoader = dataURLFileLoader;
