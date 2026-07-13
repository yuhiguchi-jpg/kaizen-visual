import { ENV } from "./env";

const LARK_AUTHORIZE_URL =
  "https://accounts.larksuite.com/open-apis/authen/v1/authorize";
const LARK_TOKEN_URL =
  "https://open.larksuite.com/open-apis/authen/v2/oauth/token";
const LARK_APP_ACCESS_TOKEN_URL =
  "https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal";
const LARK_IN_APP_TOKEN_URL =
  "https://open.larksuite.com/open-apis/authen/v1/access_token";
const LARK_USER_INFO_URL =
  "https://open.larksuite.com/open-apis/authen/v1/user_info";

type LarkTokenResponse = {
  code?: string | number;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type LarkAppAccessTokenResponse = {
  code?: string | number;
  msg?: string;
  app_access_token?: string;
};

type LarkInAppTokenResponse = {
  code?: string | number;
  msg?: string;
  data?: { access_token?: string };
};

type LarkUserInfoResponse = {
  code?: string | number;
  msg?: string;
  data?: Record<string, unknown>;
};

export type LarkUserInfo = {
  openId: string;
  userId: string | null;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  tenantKey: string | null;
};

function requireLarkCredentials() {
  if (!ENV.larkAppId || !ENV.larkAppSecret) {
    throw new Error(
      "Lark authentication is not configured. Set LARK_APP_ID and LARK_APP_SECRET."
    );
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isSuccessCode(code: unknown): boolean {
  return code === undefined || code === 0 || code === "0";
}

export function buildLarkAuthorizationUrl(input: {
  redirectUri: string;
  state: string;
}): string {
  if (!ENV.larkAppId) {
    throw new Error("LARK_APP_ID is not configured");
  }

  const url = new URL(LARK_AUTHORIZE_URL);
  url.searchParams.set("client_id", ENV.larkAppId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeLarkCode(
  code: string,
  redirectUri?: string
): Promise<string> {
  requireLarkCredentials();

  const body: Record<string, string> = {
    grant_type: "authorization_code",
    client_id: ENV.larkAppId,
    client_secret: ENV.larkAppSecret,
    code,
  };
  if (redirectUri) body.redirect_uri = redirectUri;

  const response = await fetch(LARK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json()) as LarkTokenResponse;

  if (!response.ok || !isSuccessCode(payload.code) || !payload.access_token) {
    const reason =
      payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Lark authorization code exchange failed: ${reason}`);
  }

  return payload.access_token;
}

/** Exchange a code issued by tt.requestAccess or tt.requestAuthCode. */
export async function exchangeLarkInAppCode(code: string): Promise<string> {
  requireLarkCredentials();

  const appTokenResponse = await fetch(LARK_APP_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: ENV.larkAppId,
      app_secret: ENV.larkAppSecret,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const appTokenPayload =
    (await appTokenResponse.json()) as LarkAppAccessTokenResponse;
  if (
    !appTokenResponse.ok ||
    !isSuccessCode(appTokenPayload.code) ||
    !appTokenPayload.app_access_token
  ) {
    throw new Error(
      `Lark app access token request failed: ${appTokenPayload.msg || `HTTP ${appTokenResponse.status}`}`,
    );
  }

  const tokenResponse = await fetch(LARK_IN_APP_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appTokenPayload.app_access_token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ grant_type: "authorization_code", code }),
    signal: AbortSignal.timeout(30_000),
  });
  const tokenPayload = (await tokenResponse.json()) as LarkInAppTokenResponse;
  const accessToken = tokenPayload.data?.access_token;
  if (!tokenResponse.ok || !isSuccessCode(tokenPayload.code) || !accessToken) {
    throw new Error(
      `Lark in-app code exchange failed: ${tokenPayload.msg || `HTTP ${tokenResponse.status}`}`,
    );
  }

  return accessToken;
}

export async function getLarkUserInfo(
  accessToken: string
): Promise<LarkUserInfo> {
  const response = await fetch(LARK_USER_INFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json()) as LarkUserInfoResponse;
  const data = payload.data ?? {};

  if (!response.ok || !isSuccessCode(payload.code)) {
    throw new Error(
      `Lark user info request failed: ${payload.msg || `HTTP ${response.status}`}`
    );
  }

  const openId = asString(data.open_id);
  if (!openId) {
    throw new Error("Lark user info response did not include open_id");
  }

  return {
    openId,
    userId: asString(data.user_id),
    name:
      asString(data.name) || asString(data.en_name) || asString(data.email) ||
      "Lark User",
    email: asString(data.enterprise_email) || asString(data.email),
    avatarUrl:
      asString(data.avatar_url) || asString(data.avatar_big) ||
      asString(data.avatar_middle),
    tenantKey: asString(data.tenant_key),
  };
}

export function toLarkOpenId(openId: string): string {
  return `lark:${openId}`;
}
