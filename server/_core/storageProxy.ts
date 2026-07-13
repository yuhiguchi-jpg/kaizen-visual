import type { Express, Request, Response } from "express";
import { STORAGE_PUBLIC_PREFIX } from "../storage";
import { ENV } from "./env";

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  pdf: "application/pdf",
};

export function resolveStorageContentType(
  key: string,
  upstreamContentType: string | null,
) {
  if (upstreamContentType && upstreamContentType !== "application/octet-stream") {
    return upstreamContentType;
  }

  const extension = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export function registerStorageProxy(app: Express) {
  const serveStoredObject = async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      const objectResp = await fetch(url);
      if (!objectResp.ok) {
        console.error(`[StorageProxy] object error: ${objectResp.status}`);
        res.status(502).send("Storage object error");
        return;
      }

      const contentType = resolveStorageContentType(
        key,
        objectResp.headers.get("content-type"),
      );
      const contentLength = objectResp.headers.get("content-length");
      const bytes = Buffer.from(await objectResp.arrayBuffer());

      res.set("Content-Type", contentType);
      res.set("Cache-Control", "private, max-age=3600");
      res.set("X-Content-Type-Options", "nosniff");
      if (contentLength) res.set("Content-Length", contentLength);
      res.status(200).send(bytes);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  };

  app.get(`${STORAGE_PUBLIC_PREFIX}/*`, serveStoredObject);
  // Development compatibility only. In production `/manus-storage/*` is a
  // platform-reserved route and may be intercepted before Express.
  app.get("/manus-storage/*", serveStoredObject);
}
