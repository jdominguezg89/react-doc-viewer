import { shouldSendRequestHeaders } from "./requestPolicy";

describe("shouldSendRequestHeaders", () => {
  const cross = "https://cdn.example.com/doc.pdf";
  const same = `${window.location.origin}/doc.pdf`;

  it("defaults to sending headers everywhere", () => {
    expect(shouldSendRequestHeaders(cross, undefined)).toBe(true);
    expect(shouldSendRequestHeaders(cross, {})).toBe(true);
  });

  it("supports same-origin", () => {
    const config = { fetch: { sendRequestHeadersTo: "same-origin" as const } };
    expect(shouldSendRequestHeaders(same, config)).toBe(true);
    expect(shouldSendRequestHeaders("/relative.pdf", config)).toBe(true);
    expect(shouldSendRequestHeaders(cross, config)).toBe(false);
  });

  it("supports an origin allow-list and predicates", () => {
    expect(
      shouldSendRequestHeaders(cross, {
        fetch: { sendRequestHeadersTo: ["https://cdn.example.com"] },
      }),
    ).toBe(true);
    expect(
      shouldSendRequestHeaders(cross, {
        fetch: { sendRequestHeadersTo: ["https://other.example.com"] },
      }),
    ).toBe(false);
    expect(
      shouldSendRequestHeaders(cross, {
        fetch: { sendRequestHeadersTo: (uri) => uri.endsWith(".pdf") },
      }),
    ).toBe(true);
  });

  it("denies unparsable URIs under restrictive policies", () => {
    expect(
      shouldSendRequestHeaders("::not a url::", {
        fetch: { sendRequestHeadersTo: ["https://cdn.example.com"] },
      }),
    ).toBe(false);
  });
});

describe("shouldSendRequestHeaders hardening", () => {
  it("fails closed for a plain string policy", () => {
    const config = {
      fetch: {
        sendRequestHeadersTo: "https://api.example.com" as unknown as string[],
      },
    };
    expect(
      shouldSendRequestHeaders("https://api.example.co/x.pdf", config),
    ).toBe(false);
    expect(
      shouldSendRequestHeaders("https://api.example.com/x.pdf", config),
    ).toBe(false);
  });
});
