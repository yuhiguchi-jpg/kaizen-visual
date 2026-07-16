import { describe, expect, it } from "vitest";

type LarkTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
};

type LarkChatResponse = {
  code?: number;
  msg?: string;
  data?: { name?: string };
};

describe("Lark daily insight reminder configuration", () => {
  it("authenticates and can read the configured destination chat", async () => {
    const appId = process.env.LARK_APP_ID;
    const appSecret = process.env.LARK_APP_SECRET;
    const chatId = process.env.LARK_DAILY_INSIGHT_CHAT_ID;

    expect(appId, "LARK_APP_ID is required").toBeTruthy();
    expect(appSecret, "LARK_APP_SECRET is required").toBeTruthy();
    expect(chatId).toMatch(/^oc_[A-Za-z0-9]+$/);

    const tokenResponse = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const tokenPayload = (await tokenResponse.json()) as LarkTokenResponse;
    expect(tokenResponse.ok, tokenPayload.msg).toBe(true);
    expect(tokenPayload.code, tokenPayload.msg).toBe(0);
    expect(tokenPayload.tenant_access_token).toBeTruthy();

    const chatResponse = await fetch(
      `https://open.larksuite.com/open-apis/im/v1/chats/${encodeURIComponent(chatId!)}`,
      {
        headers: { Authorization: `Bearer ${tokenPayload.tenant_access_token}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    const chatPayload = (await chatResponse.json()) as LarkChatResponse;
    expect(chatResponse.ok, chatPayload.msg).toBe(true);
    expect(chatPayload.code, chatPayload.msg).toBe(0);
    expect(chatPayload.data).toBeTruthy();
  }, 35_000);
});
