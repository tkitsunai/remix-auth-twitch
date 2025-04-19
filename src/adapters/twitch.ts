import { Authenticator } from "remix-auth";
import { TwitchStrategy, TwitchProfile } from "../twitch.strategy.js";
import type { SessionStorage } from "@remix-run/node";

export type TwitchAuthSessionDriverOptions = {
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  redirectAfterLogout?: string;
  sessionStorage: SessionStorage;
  redirect: (url: string, init?: ResponseInit) => Response;
};

/**
 * TwitchAuthSessionDriver is integrated with Remix's session storage, remix-auth
 * uses the session storage, and twitch strategy.
 * it is v3-styled remix-auth authenticator.
 */
export class TwitchAuthSessionDriver {
  private readonly authenticator: Authenticator<TwitchProfile>;

  constructor(private readonly options: TwitchAuthSessionDriverOptions) {
    this.authenticator = new Authenticator<TwitchProfile>();
    this.setupStrategy();
  }

  private setupStrategy() {
    const strategy = new TwitchStrategy<TwitchProfile>(
      {
        clientID: this.options.clientId,
        clientSecret: this.options.clientSecret,
        callbackURL: this.options.callbackURL,
      },
      async ({ profile }) => {
        return profile;
      }
    );

    this.authenticator.use(strategy);
  }

  async authenticate(request: Request) {
    return this.authenticator.authenticate("twitch", request);
  }

  async authenticateWithRedirect(
    request: Request,
    options: { successRedirect?: string; failureRedirect?: string } = {
      successRedirect: "/dashboard",
      failureRedirect: "/",
    }
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

  async getAuthUser(request: Request): Promise<TwitchProfile | null> {
    const session = await this.options.sessionStorage.getSession(
      request.headers.get("Cookie")
    );
    return session.get("user") ?? null;
  }
}
