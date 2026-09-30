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

/**
 * Picks the file type used for renderer selection: the server's content type
 * unless it is missing or an opaque binary type, in which case the URI
 * extension is used. Returns "" when nothing usable is known.
 */
export const resolveFileType = (
  contentType: string | null | undefined,
  uri: string | undefined,
): string => {
  const normalized = normalizeFileType(contentType ?? undefined);
  if (!OPAQUE_TYPES.has(normalized)) return normalized;
  return extensionFromUri(uri) || normalized;
};
