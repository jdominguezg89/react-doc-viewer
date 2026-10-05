/** Normalises anything thrown or rejected into an Error. */
export const toError = (reason: unknown): Error =>
  reason instanceof Error ? reason : new Error(String(reason));
