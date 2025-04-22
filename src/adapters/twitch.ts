import { Authenticator } from "remix-auth";
import {
  TwitchStrategy,
  TwitchProfile,
  TwitchVerifyParams,
} from "../twitch.strategy.js";
import type { SessionStorage } from "@remix-run/node";
import {
  validateAccessToken,
  ValidateAccessTokenResult,
} from "../util/validateToken.js";
import { refreshAccessToken } from "../util/refreshToken.js";

export type TwitchAuthSessionDriverOptions = {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  redirectAfterLogout?: string;
  sessionStorage: SessionStorage;
  redirect: (url: string, init?: ResponseInit) => Response;
};

export type TwitchAuthUser = {
  accessToken: string;
  refreshToken?: string;
} & TwitchProfile;

/**
 * TwitchAuthSessionDriver is integrated with Remix's session storage, remix-auth
 * uses the session storage, and twitch strategy.
 * it is v3-styled remix-auth authenticator.
 */
export class TwitchAuthSessionDriver {
  private readonly authenticator: Authenticator<TwitchAuthUser>;

  constructor(private readonly options: TwitchAuthSessionDriverOptions) {
    this.authenticator = new Authenticator<TwitchAuthUser>();
    this.setupStrategy();
  }

  private setupStrategy() {
    const strategy = new TwitchStrategy<TwitchAuthUser>(
      {
        clientID: this.options.clientId,
        clientSecret: this.options.clientSecret,
        callbackURL: this.options.callbackURL,
      },
      async ({ accessToken, refreshToken, profile }: TwitchVerifyParams) => {
        return {
          accessToken,
          refreshToken,
          ...profile,
        } as TwitchAuthUser;
      }
    );

    this.authenticator.use(strategy);
  }

  async authenticate(request: Request) {
    return this.authenticator.authenticate("twitch", request);
  }

  async authenticateWithRedirect(
    request: Request,
    options: { successRedirect?: string; failureRedirect?: string }
  ): Promise<Response> {
    try {
      const user = await this.authenticator.authenticate("twitch", request);
      const session = await this.options.sessionStorage.getSession(
        request.headers.get("Cookie")
      );
      session.set("user", user);

      return this.options.redirect(options.successRedirect ?? "/", {
        headers: {
          "Set-Cookie": await this.options.sessionStorage.commitSession(
            session
          ),
        },
      });
    } catch (err) {
      return this.options.redirect(options.failureRedirect ?? "/");
    }
  }

  async logout(request: Request): Promise<Response> {
    const session = await this.options.sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    session.unset("user");

    return this.options.redirect(this.options.redirectAfterLogout ?? "/", {
      headers: {
        "Set-Cookie": await this.options.sessionStorage.commitSession(session),
      },
    });
  }

  async getAuthUser(request: Request): Promise<TwitchAuthUser | null> {
    const session = await this.options.sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    return session.get("user") ?? null;
  }

  async isAccessTokenValid(
    request: Request
  ): Promise<ValidateAccessTokenResult> {
    const user = await this.getAuthUser(request);
    if (!user?.accessToken) return { valid: false };
    return validateAccessToken(user.accessToken);
  }

  async refreshAccessTokenIfNeeded(
    request: Request
  ): Promise<TwitchAuthUser | null> {
    const user = await this.getAuthUser(request);
    if (!user?.accessToken || !user.refreshToken) return null;

    const validation = await validateAccessToken(user.accessToken);
    if (validation.valid) return user;

    const refreshResult = await refreshAccessToken({
      refreshToken: user.refreshToken,
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
    });

    if (!refreshResult.success) {
      return null;
    }

    const updatedUser: TwitchAuthUser = {
      ...user,
      accessToken: refreshResult.access_token,
      refreshToken: refreshResult.refresh_token,
    };

    const session = await this.options.sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    session.set("user", updatedUser);

    return updatedUser;
  }
}
