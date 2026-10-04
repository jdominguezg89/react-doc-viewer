import type { MockParams } from "vitest-fetch-mock";

/** Serves `body` with a content type for every fetch until reset. */
export const mockDocumentResponse = (
  body: string,
  contentType: string | null,
  params: MockParams = {},
) => {
  const headers: Record<string, string> = {};
  if (contentType) headers["content-type"] = contentType;
  fetchMock.mockResponse(body, { headers, ...params });
};

/** Routes fetches by URL suffix to a body + content type. */
export const mockDocumentRoutes = (
  routes: Record<string, { body: string; type: string; status?: number }>,
) => {
  fetchMock.mockResponse(async (request) => {
    const url = typeof request === "string" ? request : request.url;
    const match = Object.keys(routes).find((suffix) => url.endsWith(suffix));
    if (!match) return { status: 404, body: "not found" };
    const route = routes[match];
    return {
      status: route.status ?? 200,
      body: route.body,
      headers: { "content-type": route.type },
    };
  });
};
