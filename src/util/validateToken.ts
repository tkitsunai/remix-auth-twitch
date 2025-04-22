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

  const json: {
    expires_in: number;
  } = await res.json();

  return {
    valid: true,
    expiresIn: json.expires_in,
  };
}
