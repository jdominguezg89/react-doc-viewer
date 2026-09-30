import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import type { DocRenderer } from "../../models";
import { dataURLFileLoader } from "../../utils/fileLoaders";

const DATA_URL_PREFIX = /^data:text\/html?(?:;charset=([^;,]*))?(;base64)?,/i;

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
  return new TextDecoder(charset).decode(bytes);
};

const HTMLRenderer: DocRenderer = ({ mainState: { currentDocument } }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const frame = frameRef.current;
    const data = currentDocument?.fileData;
    if (!frame || typeof data !== "string") return;

    try {
      const body = decodeHtmlDataUrl(data);
      const frameDocument = frame.contentWindow?.document;
      if (!frameDocument) return;
      frameDocument.open();
      frameDocument.write(body);
      frameDocument.close();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [currentDocument]);

  if (failed) {
    return (
      <div id="html-renderer" className="rdv-html-renderer">
        <div role="alert">{t("brokenFile")}</div>
      </div>
    );
  }

  return (
    <div id="html-renderer" className="rdv-html-renderer">
      <iframe
        ref={frameRef}
        id="html-body"
        className="rdv-html-renderer__frame"
        title={currentDocument?.fileName || "html-renderer"}
        sandbox="allow-same-origin"
      />
    </div>
  );
};

export default HTMLRenderer;

HTMLRenderer.fileTypes = ["htm", "html", "text/htm", "text/html"];
HTMLRenderer.weight = 0;
HTMLRenderer.fileLoader = dataURLFileLoader;
