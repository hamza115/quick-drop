import { encodeImage, EncodeNotNeededError, EncodeUnsupportedError } from "@/lib/compression/encode";
import type { WorkerRequest, WorkerResponse } from "@/lib/compression/messages";

// Image compression off the main thread. One worker handles one image and is then terminated,
// so cancelling an image is simply terminating its worker.

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const { file, type, settings } = event.data;

  encodeImage(file, type, settings)
    .then((result) => {
      const response: WorkerResponse = { ok: true, ...result };
      self.postMessage(response);
    })
    .catch((error: unknown) => {
      const response: WorkerResponse = {
        ok: false,
        unsupported: error instanceof EncodeUnsupportedError,
        notNeeded: error instanceof EncodeNotNeededError,
        message: error instanceof Error ? error.message : "Compression failed.",
      };
      self.postMessage(response);
    });
});
