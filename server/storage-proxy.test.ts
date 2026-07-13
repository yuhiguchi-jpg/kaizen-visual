import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    forgeApiUrl: "https://forge.example/",
    forgeApiKey: "test-key",
  },
}));

import {
  registerStorageProxy,
  resolveStorageContentType,
} from "./_core/storageProxy";

const nativeFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = nativeFetch;
});

describe("storage proxy", () => {
  it("uses the file extension when storage returns a generic MIME type", () => {
    expect(resolveStorageContentType("generated/example.png", "application/octet-stream"))
      .toBe("image/png");
    expect(resolveStorageContentType("generated/example.webp", null)).toBe("image/webp");
  });

  it("serves a stored PNG from the application origin with image/png", async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("http://127.0.0.1:")) return nativeFetch(input, init);
      if (url.startsWith("https://forge.example/")) {
        return new Response(JSON.stringify({ url: "https://storage.example/generated/test.png" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === "https://storage.example/generated/test.png") {
        return new Response(pngBytes, {
          status: 200,
          headers: {
            "content-type": "application/octet-stream",
            "content-length": String(pngBytes.byteLength),
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as typeof fetch;

    const app = express();
    registerStorageProxy(app);
    const server = app.listen(0, "127.0.0.1");

    try {
      await new Promise<void>(resolve => server.once("listening", resolve));
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Missing test server address");

      const response = await nativeFetch(
        `http://127.0.0.1:${address.port}/manus-storage/generated/test.png`,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/png");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(pngBytes);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
      });
    }
  });
});
