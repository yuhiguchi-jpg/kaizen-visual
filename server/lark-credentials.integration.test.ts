import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

type TenantTokenResponse = {
  code?: number;
  msg?: string;
  tenant_access_token?: string;
};

describe("Lark credentials integration", () => {
  it("obtains a tenant access token with the configured app credentials", async () => {
    expect(ENV.larkAppId, "LARK_APP_ID must be configured").toBeTruthy();
    expect(ENV.larkAppSecret, "LARK_APP_SECRET must be configured").toBeTruthy();

    const response = await fetch(
      "https://open.larksuite.com/open-apis/auth/v3/tenant_access_token/internal",
      {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          app_id: ENV.larkAppId,
          app_secret: ENV.larkAppSecret,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );
    const payload = (await response.json()) as TenantTokenResponse;

    expect(response.ok).toBe(true);
    expect(payload.code, payload.msg || "Lark credential validation failed").toBe(0);
    expect(payload.tenant_access_token).toMatch(/^t-/);
  });
});
