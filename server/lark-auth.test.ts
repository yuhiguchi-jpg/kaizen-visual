import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ENV } from "./_core/env";
import {
  buildLarkAuthorizationUrl,
  exchangeLarkCode,
  getLarkUserInfo,
  toLarkOpenId,
} from "./_core/larkAuth";

const originalFetch = globalThis.fetch;
const originalAppId = ENV.larkAppId;
const originalAppSecret = ENV.larkAppSecret;

beforeEach(() => {
  ENV.larkAppId = "cli_test_app";
  ENV.larkAppSecret = "test-secret";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  ENV.larkAppId = originalAppId;
  ENV.larkAppSecret = originalAppSecret;
  vi.restoreAllMocks();
});

describe("Lark OAuth", () => {
  it("builds the official Lark authorization URL", () => {
    const result = new URL(
      buildLarkAuthorizationUrl({
        redirectUri: "https://kaizen.example/api/oauth/lark/callback",
        state: "csrf-state",
      })
    );

    expect(result.origin).toBe("https://accounts.larksuite.com");
    expect(result.pathname).toBe("/open-apis/authen/v1/authorize");
    expect(result.searchParams.get("client_id")).toBe("cli_test_app");
    expect(result.searchParams.get("redirect_uri")).toBe(
      "https://kaizen.example/api/oauth/lark/callback"
    );
    expect(result.searchParams.get("response_type")).toBe("code");
    expect(result.searchParams.get("state")).toBe("csrf-state");
    expect(result.searchParams.has("scope")).toBe(false);
  });

  it("exchanges an authorization code using the v2 token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ code: "0", access_token: "user-access-token" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    globalThis.fetch = fetchMock;

    await expect(
      exchangeLarkCode(
        "temporary-code",
        "https://kaizen.example/api/oauth/lark/callback"
      )
    ).resolves.toBe("user-access-token");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/open-apis/authen/v2/oauth/token");
    expect(JSON.parse(String(init.body))).toMatchObject({
      grant_type: "authorization_code",
      client_id: "cli_test_app",
      client_secret: "test-secret",
      code: "temporary-code",
      redirect_uri: "https://kaizen.example/api/oauth/lark/callback",
    });
  });

  it("normalizes Lark user information and namespaces the open ID", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          data: {
            open_id: "ou_123",
            user_id: "u_123",
            name: "改善 太郎",
            enterprise_email: "taro@example.com",
            avatar_url: "https://example.com/avatar.png",
            tenant_key: "tenant_123",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const user = await getLarkUserInfo("user-access-token");

    expect(user).toMatchObject({
      openId: "ou_123",
      userId: "u_123",
      name: "改善 太郎",
      email: "taro@example.com",
      tenantKey: "tenant_123",
    });
    expect(toLarkOpenId(user.openId)).toBe("lark:ou_123");
  });
});
