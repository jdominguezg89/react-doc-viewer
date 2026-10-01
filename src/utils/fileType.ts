/** Lower-cases a MIME type or extension and strips parameters (`; charset=`). */
export const normalizeFileType = (fileType: string | undefined): string =>
  (fileType ?? "").split(";")[0].trim().toLowerCase();

/** Extracts the lower-cased extension from a URI (without query/hash), or "". */
export const extensionFromUri = (uri: string | undefined): string => {
  if (!uri) return "";
  const path = uri.split(/[?#]/)[0];
  const lastSegment = path.split("/").pop() ?? "";
  const dot = lastSegment.lastIndexOf(".");
  return dot > 0 ? lastSegment.slice(dot + 1).toLowerCase() : "";
};

const OPAQUE_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

export const UNKNOWN_FILE_TYPE = "application/octet-stream";

/** True for a missing content type or a generic binary one. */
export const isOpaqueFileType = (
  fileType: string | null | undefined,
): boolean => OPAQUE_TYPES.has(normalizeFileType(fileType ?? undefined));

/**
 * Picks the file type used for renderer selection: the server's content type
 * unless it is missing or an opaque binary type, in which case the URI
 * extension is used. When nothing usable is known the result is
 * `application/octet-stream`, so the viewer can fall through to a renderer
 * registered for that type or to the "no renderer" state.
 */
export const resolveFileType = (
  contentType: string | null | undefined,
  uri: string | undefined,
): string => {
  const normalized = normalizeFileType(contentType ?? undefined);
  if (!OPAQUE_TYPES.has(normalized)) return normalized;
  return extensionFromUri(uri) || normalized || UNKNOWN_FILE_TYPE;
};

/**
 * Like `resolveFileType`, but aware of the registered renderers: when the
 * content type is opaque and the URL extension is not something any renderer
 * handles, a renderer registered for `application/octet-stream` gets the
 * document instead (as in 1.x).
 */
export const resolveFileTypeForRenderers = (
  contentType: string | null | undefined,
  uri: string | undefined,
  canRender: (fileType: string) => boolean,
): string => {
  const resolved = resolveFileType(contentType, uri);
  if (!isOpaqueFileType(contentType) || resolved === UNKNOWN_FILE_TYPE) {
    return resolved;
  }
  if (!canRender(resolved) && canRender(UNKNOWN_FILE_TYPE)) {
    return UNKNOWN_FILE_TYPE;
  }
  return resolved;
};
