export type RefreshTokenResult =
  | {
      success: true;
      access_token: string;
      refresh_token: string;
      expires_in: number;
    }
  | {
      success: false;
    };

export type RefreshTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
};

export async function refreshAccessToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<RefreshTokenResult> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) return { success: false };

  try {
    const json = await res.json() as unknown;

    if (
      typeof json === "object" &&
      json !== null &&
      "access_token" in json &&
      "refresh_token" in json &&
      "expires_in" in json
    ) {
      const validJson = json as RefreshTokenResponse;
      return {
        success: true,
        access_token: validJson.access_token,
        refresh_token: validJson.refresh_token,
        expires_in: validJson.expires_in,
      };
    }
  } catch (e) {
    console.error("Failed to parse response JSON", e);
  }
  return { success: false };
}
