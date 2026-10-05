import type { IConfig } from "../models";

/** Whether `requestHeaders` may be attached to a request for `uri`. */
export const shouldSendRequestHeaders = (
  uri: string,
  config: IConfig | undefined,
): boolean => {
  const policy = config?.fetch?.sendRequestHeadersTo ?? "all";
  if (policy === "all") return true;
  if (typeof policy === "function") return policy(uri);

  let origin: string;
  try {
    // Resolve like `fetch` does: against the document base URL (<base href>).
    origin = new URL(
      uri,
      typeof document !== "undefined" ? document.baseURI : undefined,
    ).origin;
  } catch {
    return false;
  }

  if (policy === "same-origin") {
    return typeof window !== "undefined" && origin === window.location.origin;
  }
  // Anything that is not a list of origins fails closed.
  return Array.isArray(policy) && policy.includes(origin);
};
