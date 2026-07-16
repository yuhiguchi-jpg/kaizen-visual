import { ENV } from "./_core/env";

const LARK_TENANT_ACCESS_TOKEN_URL =
  "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal";
const LARK_MESSAGES_URL =
  "https://open.larksuite.com/open-apis/im/v1/messages";

type LarkTenantTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
};

type LarkMessageResponse = {
  code?: number;
  msg?: string;
  data?: { message_id?: string };
};

async function getTenantAccessToken(): Promise<string> {
  if (!ENV.larkAppId || !ENV.larkAppSecret) {
    throw new Error("Lark app credentials are not configured");
  }

  const response = await fetch(LARK_TENANT_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: ENV.larkAppId,
      app_secret: ENV.larkAppSecret,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json()) as LarkTenantTokenResponse;
  if (!response.ok || payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(
      `Lark tenant token request failed: ${payload.msg || `HTTP ${response.status}`}`,
    );
  }
  return payload.tenant_access_token;
}

export async function sendLarkTextMessage(input: {
  chatId: string;
  text: string;
}): Promise<{ messageId: string | null }> {
  if (!input.chatId) throw new Error("Lark destination chat ID is not configured");
  if (!input.text.trim()) throw new Error("Lark message text is empty");

  const tenantAccessToken = await getTenantAccessToken();
  const url = new URL(LARK_MESSAGES_URL);
  url.searchParams.set("receive_id_type", "chat_id");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tenantAccessToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      receive_id: input.chatId,
      msg_type: "text",
      content: JSON.stringify({ text: input.text }),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json()) as LarkMessageResponse;
  if (!response.ok || payload.code !== 0) {
    throw new Error(
      `Lark message send failed: ${payload.msg || `HTTP ${response.status}`}`,
    );
  }

  return { messageId: payload.data?.message_id ?? null };
}
