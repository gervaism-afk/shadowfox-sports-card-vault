"use client";

export async function recognizeCardImage(image: string, progress: (message: string) => void, signal?: AbortSignal) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr/core",
    langPath: "/ocr/lang",
    workerBlobURL: false,
    logger: ({ status, progress: fraction }) => {
      progress(status === "recognizing text" ? `Reading card text… ${Math.round(fraction * 100)}%` : "Preparing card reader…");
    },
  });
  let abort: (() => void) | undefined;
  try {
    if (signal?.aborted) throw new Error("Scan cancelled");
    const cancelled = new Promise<never>((_resolve, reject) => {
      abort = () => reject(new Error("Scan cancelled"));
      signal?.addEventListener("abort", abort, { once: true });
    });
    const { data } = await Promise.race([worker.recognize(image), cancelled]);
    return data.text.trim();
  } finally {
    if (abort) signal?.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
