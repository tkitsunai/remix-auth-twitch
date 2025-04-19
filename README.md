# Remix Auth Twitch

`@tkitsunai/remix-auth-twitch`

Twitch authentication strategy for remix-auth.

See also:

- [remix-auth github](https://github.com/sergiodxa/remix-auth)
- [remix-auth docs](https://sergiodxa.github.io/remix-auth/)
- [Authentication | Twitch Developers](https://dev.twitch.tv/docs/authentication)

## How to use

Install remix-auth-twitch npm module along with remix-auth:

### Installation

Install @tkitsunai/remix-auth-twitch npm module along with remix-auth:

```
pnpm add remix-auth@v4.2.0 @tkitsunai/remix-auth-twitch
```

### Basic Usage (v4 strategy-only)

```ts
import { TwitchStrategy } from "@tkitsunai/remix-auth-twitch";
import { Authenticator } from "remix-auth";

const authenticator = new Authenticator<User>();

authenticator.use(
  new TwitchStrategy(
    {
      clientID: process.env.TWITCH_CLIENT_ID!,
      clientSecret: process.env.TWITCH_CLIENT_SECRET!,
      callbackURL: "http://localhost:3000/auth/twitch/callback",
    },
    async ({ accessToken, profile }) => {
      return {
        id: profile.id,
        name: profile.display_name,
        email: profile.email,
        thumbnail: profile.profile_image_url,
      };
    }
  )
);
```

### Optional: v3-style integrated adapter

If you prefer an all-in-one interface like remix-auth v3 (handling Strategy + Authenticator + Session),
this package provides a class-based adapter:

```ts
import {
  createCookieSessionStorage,
  redirect,
} from "@remix-run/node"; // or @remix-run/cloudflare

import {
  TwitchAuthSessionDriver,
} from "@tkitsunai/remix-auth-twitch/adapters";

const sessionStorage = createCookieSessionStorage({
  secrets: [process.env.SESSION_SECRET!],
  ...
});

const twitch = new TwitchAuthSessionDriver({
  clientId: process.env.TWITCH_CLIENT_ID!,
  clientSecret: process.env.TWITCH_CLIENT_SECRET!,
  callbackURL: "http://localhost:3000/auth/twitch/callback",
  sessionStorage,
  redirect,
});
```

#### Example usage in a Remix Action

```ts
export const action = async ({ request }: ActionFunctionArgs) => {
  return twitch.authenticateWithRedirect(request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};
```

> [!WARNING]
> The `adapters` driver is runtime-agnostic, but you must provide the `redirect` function and a Remix-compatible `SessionStorage` (e.g., from `@remix-run/node` or `@remix-run/cloudflare`).
