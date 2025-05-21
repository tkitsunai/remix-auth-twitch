export type ValidateAccessTokenResult =
  | {
      valid: true;
      expiresIn?: number;
    }
  | {
      valid: false;
    };

export async function validateAccessToken(
  token: string
): Promise<ValidateAccessTokenResult> {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return { valid: false };
  }

  try {
    const json = await res.json();

    if (typeof json === "object" && json !== null && "expires_in" in json) {
      return {
        valid: true,
        expiresIn: json.expires_in,
      };
    }
  } catch (e) {
    console.error("Failed to parse response JSON", e);
  }
  return { valid: false };
}
