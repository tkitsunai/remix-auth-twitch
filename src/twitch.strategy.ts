import { Strategy } from "remix-auth/strategy";

export interface TwitchProfile {
  id: string;
  login: string;
  display_name: string;
  email: string;
  profile_image_url: string;
}

export interface TwitchStrategyOptions {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope?: string;
}

export interface TwitchVerifyParams {
  accessToken: string;
  refreshToken?: string;
  extraParams: {
    expires_in?: number;
    token_type?: string;
  };
  profile: TwitchProfile;
}

export class TwitchStrategy<User> extends Strategy<User, TwitchVerifyParams> {
  name = "twitch";

  constructor(
    private options: TwitchStrategyOptions,
    verify: Strategy.VerifyFunction<User, TwitchVerifyParams>
  ) {
    super(verify);
  }

  async authenticate(request: Request): Promise<User> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
      const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", this.options.clientID);
      authUrl.searchParams.set("redirect_uri", this.options.callbackURL);
      authUrl.searchParams.set(
        "scope",
        this.options.scope ?? "user:read:email"
      );
      authUrl.searchParams.set("state", crypto.randomUUID());

      throw new Response(null, {
        status: 302,
        headers: {
          Location: authUrl.toString(),
        },
      });
    }

    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.options.clientID,
        client_secret: this.options.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: this.options.callbackURL,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Response("Failed to fetch access token", { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const extraParams = {
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    };

    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": this.options.clientID,
      },
    });

    if (!userResponse.ok) {
      throw new Response("Failed to fetch user profile", { status: 401 });
    }

    const userJson = await userResponse.json();
    const profile = userJson.data?.[0] as TwitchProfile;

    if (!profile) {
      throw new Response("Invalid user data received from Twitch", {
        status: 500,
      });
    }

    const user = await this.verify({
      accessToken,
      refreshToken,
      extraParams,
      profile,
    });

    return user;
  }
}
