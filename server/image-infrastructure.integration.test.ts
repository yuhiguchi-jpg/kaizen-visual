import { describe, expect, it } from "vitest";
import { listImageModels } from "./_core/imageGeneration";
import { storageGetSignedUrl, storagePut } from "./storage";

const describeIntegration = process.env.RUN_IMAGE_INFRA_INTEGRATION_TEST === "1"
  ? describe
  : describe.skip;

describeIntegration("image generation infrastructure", () => {
  it("can access image models and round-trip a stored object", async () => {
    const models = await listImageModels();
    expect(models.models.some(model => model.model === "MODEL_GPT_IMAGE_2")).toBe(true);

    const marker = `kaizen-vision-storage-check-${Date.now()}`;
    const stored = await storagePut(
      `diagnostics/${Date.now()}.txt`,
      marker,
      "text/plain; charset=utf-8",
    );

    expect(stored.url).toBe(`/manus-storage/${stored.key}`);

    const signedUrl = await storageGetSignedUrl(stored.key);
    const response = await fetch(signedUrl);
    expect(response.ok).toBe(true);
    expect(await response.text()).toBe(marker);
  }, 30_000);
});
