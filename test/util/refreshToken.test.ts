import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { refreshAccessToken } from "../../src/util/refreshToken";

describe("refreshAccessToken", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return success result when refresh is successful", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      refresh_token: "new-refresh-token",
      expires_in: 3600,
      scope: ["clips:edit", "clips:read"],
      token_type: "bearer",
    };

    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await refreshAccessToken({
      refreshToken: "dummy-refresh-token",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    expect(result).toEqual({
      success: true,
      access_token: mockResponse.access_token,
      refresh_token: mockResponse.refresh_token,
      expires_in: mockResponse.expires_in,
    });
  });

  it("should return failure result when refresh fails", async () => {
    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: false,
    });

    const result = await refreshAccessToken({
      refreshToken: "dummy-refresh-token",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    expect(result).toEqual({ success: false });
  });

  it("should return failure result when response body is invalid", async () => {
    const invalidResponse = {
      invalid_field: "oops",
    };

    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => invalidResponse,
    });

    const result = await refreshAccessToken({
      refreshToken: "dummy-refresh-token",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    expect(result).toEqual({ success: false });
  });

  it("should return failure result when json parsing throws", async () => {
    (global.fetch as unknown as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    const result = await refreshAccessToken({
      refreshToken: "dummy-refresh-token",
      clientId: "dummy-client-id",
      clientSecret: "dummy-client-secret",
    });

    expect(result).toEqual({ success: false });
  });
});
