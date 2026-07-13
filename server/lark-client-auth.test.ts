import { describe, expect, it, vi } from "vitest";
import {
  isLarkClient,
  requestLarkAccessCode,
  requestLarkAccessCodeWithRetry,
  startLogin,
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

  it("keeps waiting when the SDK reports a transient bridge error", async () => {
    const bridge = { requestAccess: vi.fn() } as LarkBridge;
    let readyCallback: (() => void) | undefined;
    let errorCallback: ((error: unknown) => void) | undefined;
    const sdk = {
      ready(callback) {
        readyCallback = callback;
      },
      error(callback) {
        errorCallback = callback;
      },
    } as LarkH5Sdk;
    const getBridge = vi.fn(() => bridge);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const resultPromise = waitForLarkSdkReady({ sdk, getBridge, timeoutMs: 1_000 });
    errorCallback?.(new Error("cannot find pc bridge"));
    expect(getBridge).not.toHaveBeenCalled();

    readyCallback?.();

    await expect(resultPromise).resolves.toBe(bridge);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("falls back to OAuth when a user-started in-app access request fails", async () => {
    const assign = vi.fn();
    const requestAccess = vi.fn((options) => {
      options.fail(new Error("cannot find pc bridge"));
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ appId: "cli_test_app", state: "csrf-state" }),
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      navigator: { userAgent: "Mozilla/5.0 Lark/7.0.0" },
      h5sdk: { ready: (callback: () => void) => callback() },
      tt: { requestAccess },
      location: { assign, reload: vi.fn() },
    });

    try {
      await startLogin();

      expect(requestAccess).toHaveBeenCalledTimes(2);
      expect(assign).toHaveBeenCalledWith("/api/oauth/lark/start");
      expect(warn).toHaveBeenCalledWith(
        "[Lark Auth] In-app login failed; using OAuth fallback",
        expect.any(Error),
      );
    } finally {
      vi.unstubAllGlobals();
      warn.mockRestore();
    }
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

  it("retries a transient bridge failure before using another login path", async () => {
    const requestAccess = vi.fn()
      .mockImplementationOnce(options => options.fail(new Error("cannot find pc bridge")))
      .mockImplementationOnce(options => options.success({ code: "retry-code", state: options.state }));
    const bridge = { requestAccess } as LarkBridge;

    await expect(
      requestLarkAccessCodeWithRetry(
        bridge,
        { appId: "cli_test_app", state: "csrf-state" },
        { retryDelayMs: 0 },
      ),
    ).resolves.toEqual({ code: "retry-code", state: "csrf-state" });

    expect(requestAccess).toHaveBeenCalledTimes(2);
  });

  it("falls back to requestAuthCode on older Lark clients", async () => {
    const requestAuthCode = vi.fn((options) => {
      options.success({ code: "legacy-code" });
    });
    const bridge = { requestAuthCode } as LarkBridge;

    await expect(
      requestLarkAccessCode(bridge, {
        appId: "cli_test_app",
        state: "csrf-state",
      }),
    ).resolves.toEqual({ code: "legacy-code", state: "csrf-state" });

    expect(requestAuthCode).toHaveBeenCalledWith(
      expect.objectContaining({ appId: "cli_test_app" }),
    );
  });
});
