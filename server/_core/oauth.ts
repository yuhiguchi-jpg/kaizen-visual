import { randomBytes } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, OAUTH_STATE_COOKIE, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import {
  buildLarkAuthorizationUrl,
  exchangeLarkCode,
  exchangeLarkInAppCode,
  getLarkUserInfo,
  toLarkOpenId,
} from "./larkAuth";
import { sdk } from "./sdk";

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0]?.trim() || req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function getRedirectUri(req: Request): string {
  return (
    ENV.larkRedirectUri ||
    `${getRequestOrigin(req)}/api/oauth/lark/callback`
  );
}

function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

function setStateCookie(req: Request, res: Response, state: string) {
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(OAUTH_STATE_COOKIE, state, {
    ...cookieOptions,
    sameSite: "lax",
    maxAge: OAUTH_STATE_TTL_MS,
  });
}

function clearStateCookie(req: Request, res: Response) {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(OAUTH_STATE_COOKIE, {
    ...cookieOptions,
    sameSite: "lax",
  });
}

function hasValidState(req: Request, state: string | undefined): boolean {
  if (!state) return false;
  const expected = parseCookieHeader(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
  return expected === state;
}

async function completeLarkLogin(
  req: Request,
  res: Response,
  code: string,
  options?: { redirectUri?: string; inApp?: boolean }
) {
  const accessToken = options?.inApp
    ? await exchangeLarkInAppCode(code)
    : await exchangeLarkCode(code, options?.redirectUri);
  const larkUser = await getLarkUserInfo(accessToken);
  const openId = toLarkOpenId(larkUser.openId);

  await db.upsertUser({
    openId,
    name: larkUser.name,
    email: larkUser.email,
    loginMethod: "lark",
    lastSignedIn: new Date(),
  });

  const sessionToken = await sdk.createSessionToken(openId, {
    name: larkUser.name,
    expiresInMs: ONE_YEAR_MS,
  });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });

  return {
    name: larkUser.name,
    email: larkUser.email,
  };
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/lark/start", (req: Request, res: Response) => {
    try {
      const state = createOAuthState();
      setStateCookie(req, res, state);
      res.redirect(
        302,
        buildLarkAuthorizationUrl({
          redirectUri: getRedirectUri(req),
          state,
        })
      );
    } catch (error) {
      console.error("[Lark OAuth] Login start failed", error);
      res.redirect(302, "/?auth_error=lark_not_configured");
    }
  });

  app.get("/api/oauth/lark/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !hasValidState(req, state)) {
      res.redirect(302, "/?auth_error=invalid_state");
      return;
    }

    clearStateCookie(req, res);
    try {
      await completeLarkLogin(req, res, code, {
        redirectUri: getRedirectUri(req),
      });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Lark OAuth] Callback failed", error);
      res.redirect(302, "/?auth_error=login_failed");
    }
  });

  // Called before tt.requestAccess. Returning a server-generated state binds
  // the one-time Lark code to the same WebView that initiated sign-in.
  app.get("/api/oauth/lark/config", (req: Request, res: Response) => {
    if (!ENV.larkAppId) {
      res.status(503).json({ error: "Lark authentication is not configured" });
      return;
    }
    const state = createOAuthState();
    setStateCookie(req, res, state);
    res.json({ appId: ENV.larkAppId, state });
  });

  app.post("/api/oauth/lark/code", async (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const state = typeof req.body?.state === "string" ? req.body.state : "";
    if (!code || code.length > 2048 || !hasValidState(req, state)) {
      res.status(403).json({ error: "Invalid Lark login request" });
      return;
    }

    clearStateCookie(req, res);
    try {
      const user = await completeLarkLogin(req, res, code, { inApp: true });
      res.json({ success: true, user });
    } catch (error) {
      console.error("[Lark OAuth] In-app login failed", error);
      res.status(401).json({ error: "Lark login failed" });
    }
  });

  // Manus OAuth is intentionally disabled after the Lark identity cut-over.
  app.get("/api/oauth/callback", (_req: Request, res: Response) => {
    res.status(410).json({ error: "This login method is no longer available" });
  });
}
