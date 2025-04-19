import { describe, it, expect, vi } from "vitest";
import { TwitchStrategy } from "../src/twitch.strategy";
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
