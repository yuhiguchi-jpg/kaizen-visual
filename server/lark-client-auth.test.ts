import { describe, expect, it, vi } from "vitest";
import {
  isLarkClient,
  requestLarkAccessCode,
  waitForLarkSdkReady,
  type LarkBridge,
  type LarkH5Sdk,
} from "../client/src/const";

describe("Lark in-app access request", () => {
  it("distinguishes Lark and ordinary browser user agents", () => {
    expect(isLarkClient("Mozilla/5.0 Lark/7.0.0")).toBe(true);
    expect(isLarkClient("Mozilla/5.0 Feishu/7.0.0")).toBe(true);
    expect(isLarkClient("Mozilla/5.0 Chrome/126.0.0.0")).toBe(false);
  });

  it("waits for h5sdk.ready before reading the Lark bridge", async () => {
    const bridge = { requestAccess: vi.fn() } as LarkBridge;
    let readyCallback: (() => void) | undefined;
    const sdk = {
      ready(callback) {
        readyCallback = callback;
      },
    } as LarkH5Sdk;
    const getBridge = vi.fn(() => bridge);

    const resultPromise = waitForLarkSdkReady({
      sdk,
      getBridge,
      timeoutMs: 1_000,
    });
    expect(getBridge).not.toHaveBeenCalled();

    readyCallback?.();

    await expect(resultPromise).resolves.toBe(bridge);
    expect(getBridge).toHaveBeenCalledOnce();
  });

  it("requests only basic sign-in credentials with an empty scope list", async () => {
    const requestAccess = vi.fn((options) => {
      options.success({ code: "temporary-code", state: options.state });
    });
    const bridge = { requestAccess } as LarkBridge;

    await expect(
      requestLarkAccessCode(bridge, {
        appId: "cli_test_app",
        state: "csrf-state",
      })
    ).resolves.toEqual({ code: "temporary-code", state: "csrf-state" });

    expect(requestAccess).toHaveBeenCalledWith(
      expect.objectContaining({
        appID: "cli_test_app",
        state: "csrf-state",
        scopeList: [],
      })
    );
  });
});
