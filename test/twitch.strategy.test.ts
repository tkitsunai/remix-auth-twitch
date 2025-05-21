import { describe, it, expect, vi } from "vitest";
import { TwitchStrategy, normalizeScope } from "../src/twitch.strategy";
import type { TwitchProfile, TwitchVerifyParams } from "../src/twitch.strategy";

function createRequest(url: string): Request {
  return new Request(url);
}

describe("TwitchStrategy", () => {
  const strategy = new TwitchStrategy(
    {
      clientID: "mock-client-id",
      clientSecret: "mock-client-secret",
      callbackURL: "http://localhost:3000/auth/twitch/callback",
    },
    async ({ accessToken, profile }: TwitchVerifyParams) => {
      return {
        id: profile.id,
        name: profile.display_name,
        token: accessToken,
      };
    }
  );

  it("should redirect when no code is present", async () => {
    const request = createRequest("http://localhost:3000/auth/twitch");
    try {
      await strategy.authenticate(request);
      throw new Error("Expected redirect");
    } catch (err: any) {
      expect(err instanceof Response).toBe(true);
      expect(err.status).toBe(302);
      expect(err.headers.get("Location")).toContain(
        "https://id.twitch.tv/oauth2/authorize"
      );
    }
  });

  it("should return user when code is present", async () => {
    const mockAccessToken = "mock-access-token";
    const mockProfile: TwitchProfile = {
      id: "123",
      login: "mockuser",
      display_name: "Mock User",
      email: "mock@example.com",
      profile_image_url: "http://example.com/avatar.png",
    };

    global.fetch = vi
      .fn()
      // Token API response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: mockAccessToken,
          refresh_token: "mock-refresh",
          expires_in: 3600,
          token_type: "bearer",
        }),
      })
      // Profile API response
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [mockProfile] }),
      });

    const request = createRequest(
      "http://localhost:3000/auth/twitch?code=abc123"
    );
    const result = await strategy.authenticate(request);

    expect(result).toEqual({
      id: "123",
      name: "Mock User",
      token: mockAccessToken,
    });
  });
});

describe("normalizeScope", () => {
  it("should return defaultScope if scope is undefined", () => {
    expect(normalizeScope(undefined, "default:scope")).toBe("default:scope");
  });
  it("should return defaultScope if scope is empty array", () => {
    expect(normalizeScope([], "default:scope")).toBe("default:scope");
  });
  it("should return the string if scope is a string", () => {
    expect(normalizeScope("user:read:email", "default:scope")).toBe(
      "user:read:email"
    );
  });
  it("should join array with space if scope is string[]", () => {
    expect(
      normalizeScope(["user:read:email", "clips:edit"], "default:scope")
    ).toBe("user:read:email clips:edit");
  });
  it("should use TwitchStrategyOptions.scope if provided", () => {
    // Strategy経由でscopeが渡る場合の動作例
    const opts = {
      clientID: "id",
      clientSecret: "sec",
      callbackURL: "cb",
      scope: ["a", "b"],
    };
    expect(normalizeScope(opts.scope, "default:scope")).toBe("a b");
  });
});
