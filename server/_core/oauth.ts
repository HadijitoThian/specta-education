import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import crypto from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRedirectUri(req: Request): string {
  if (ENV.appUrl) {
    return `${ENV.appUrl.replace(/\/+$/, "")}/api/oauth/callback`;
  }
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}/api/oauth/callback`;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/login", (req: Request, res: Response) => {
    const state = crypto.randomBytes(24).toString("hex");
    const redirectUri = getRedirectUri(req);

    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...getSessionCookieOptions(req),
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    const url = sdk.buildAuthorizeUrl({ redirectUri, state });
    res.redirect(302, url);
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const parsedCookies = parseCookieHeader(req.headers.cookie ?? "");
    const cookieState = parsedCookies[OAUTH_STATE_COOKIE];

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    if (!cookieState || cookieState !== state) {
      res.status(400).json({ error: "invalid oauth state" });
      return;
    }

    try {
      const redirectUri = getRedirectUri(req);
      const tokenResponse = await sdk.exchangeCodeForToken(code, redirectUri);
      const userInfo = await sdk.getUserInfo(tokenResponse.access_token);

      if (!userInfo.sub) {
        res.status(400).json({ error: "sub missing from user info" });
        return;
      }

      const openId = `google:${userInfo.sub}`;

      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || "",
        email: userInfo.email ?? null,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.clearCookie(OAUTH_STATE_COOKIE);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
