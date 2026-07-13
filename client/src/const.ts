export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export type LarkAccessResult = {
  code: string;
  state?: string;
};

export type LarkBridge = {
  requestAccess(options: {
    scopeList: string[];
    appID: string;
    state: string;
    success(result: LarkAccessResult): void;
    fail(error: unknown): void;
  }): void;
};

export type LarkH5Sdk = {
  ready(callback: () => void): void;
  error?(callback: (error: unknown) => void): void;
};

declare global {
  interface Window {
    tt?: LarkBridge;
    h5sdk?: LarkH5Sdk;
  }
}

let loginInFlight = false;

export function isLarkClient(userAgent: string): boolean {
  return /Lark|Feishu/i.test(userAgent);
}

export function waitForLarkSdkReady(input: {
  sdk?: LarkH5Sdk;
  getBridge: () => LarkBridge | undefined;
  timeoutMs?: number;
}): Promise<LarkBridge | null> {
  const sdk = input.sdk;
  if (!sdk?.ready) {
    return Promise.resolve(input.getBridge() ?? null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (bridge: LarkBridge | null) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeoutId);
      resolve(bridge);
    };
    const timeoutId = globalThis.setTimeout(
      () => finish(null),
      input.timeoutMs ?? 3_000
    );

    sdk.ready(() => finish(input.getBridge() ?? null));
    sdk.error?.(() => finish(null));
  });
}

export function requestLarkAccessCode(
  bridge: LarkBridge,
  config: { appId: string; state: string }
): Promise<LarkAccessResult> {
  return new Promise<LarkAccessResult>((resolve, reject) => {
    bridge.requestAccess({
      scopeList: [],
      appID: config.appId,
      state: config.state,
      success: resolve,
      fail: reject,
    });
  });
}

async function startLarkInAppLogin(bridge: LarkBridge): Promise<void> {
  const configResponse = await fetch("/api/oauth/lark/config", {
    credentials: "include",
  });
  if (!configResponse.ok) {
    throw new Error("Lark login configuration could not be loaded");
  }
  const config = (await configResponse.json()) as {
    appId: string;
    state: string;
  };

  const access = await requestLarkAccessCode(bridge, config);

  const response = await fetch("/api/oauth/lark/code", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: access.code,
      state: access.state || config.state,
    }),
  });
  if (!response.ok) {
    throw new Error("Lark in-app login failed");
  }

  window.location.reload();
}

/**
 * Start Lark sign-in. Inside Lark this uses tt.requestAccess without leaving the
 * app; ordinary browsers are redirected to Lark OAuth.
 */
export async function startLogin(): Promise<void> {
  if (loginInFlight) return;
  loginInFlight = true;

  if (!isLarkClient(window.navigator.userAgent)) {
    window.location.assign("/api/oauth/lark/start");
    loginInFlight = false;
    return;
  }

  try {
    const bridge = await waitForLarkSdkReady({
      sdk: window.h5sdk,
      getBridge: () => window.tt,
    });
    if (!bridge?.requestAccess) {
      throw new Error("Lark H5 SDK is not available");
    }
    await startLarkInAppLogin(bridge);
  } catch (error) {
    console.error("[Lark Auth] In-app login failed; using OAuth fallback", error);
    window.location.assign("/api/oauth/lark/start");
  } finally {
    loginInFlight = false;
  }
}
