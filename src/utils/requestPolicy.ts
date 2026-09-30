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
    origin = new URL(
      uri,
      typeof window !== "undefined" ? window.location.href : undefined,
    ).origin;
  } catch {
    return false;
  }

  if (policy === "same-origin") {
    return typeof window !== "undefined" && origin === window.location.origin;
  }
  return policy.includes(origin);
};
