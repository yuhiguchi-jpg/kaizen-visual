import { ForbiddenError } from "@shared/_core/errors";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const CRON_OPEN_ID_PREFIX = "cron_";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  taskUid?: string;
};

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

function buildCronUser(session: SessionPayload): AuthenticatedUser {
  const now = new Date();
  return {
    id: -1,
    openId: session.openId,
    name: session.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    isInsightReminderExcluded: false,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: session.taskUid,
    isCron: true,
  };
}

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  private getSessionSecret() {
    if (!ENV.cookieSecret) {
      throw new Error("JWT_SECRET is not configured");
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  async createSessionToken(
    openId: string,
    options: { expiresInMs?: number; name?: string } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        appId: ENV.larkAppId || "lark",
        name: options.name || "Lark User",
      },
      options
    );
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      ...(payload.taskUid ? { taskUid: payload.taskUid } : {}),
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;

    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), {
        algorithms: ["HS256"],
      });
      const { openId, appId, name, taskUid } = payload as Record<string, unknown>;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name)
      ) {
        return null;
      }

      return {
        openId,
        appId,
        name,
        taskUid: isNonEmptyString(taskUid) ? taskUid : undefined,
      };
    } catch (error) {
      console.warn("[Auth] Lark session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionToken = cookies.get(COOKIE_NAME);

    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid Lark session");
    }

    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      if (!session.taskUid) throw ForbiddenError("Cron session missing task_uid");
      return buildCronUser(session);
    }

    if (!session.openId.startsWith("lark:")) {
      throw ForbiddenError("Invalid Lark session");
    }

    const user = await db.getUserByOpenId(session.openId);
    if (!user) {
      throw ForbiddenError("Lark user not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: new Date(),
    });

    return user;
  }
}

export const sdk = new SDKServer();
