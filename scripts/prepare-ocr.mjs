import { mkdir, copyFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const output = new URL("../public/ocr/", import.meta.url);
await mkdir(new URL("core/", output), { recursive: true });
await mkdir(new URL("lang/", output), { recursive: true });
const tesseract = dirname(require.resolve("tesseract.js/package.json"));
const core = dirname(require.resolve("tesseract.js-core/package.json"));
const english = dirname(require.resolve("@tesseract.js-data/eng/package.json"));
await copyFile(join(tesseract, "dist/worker.min.js"), new URL("worker.min.js", output));
await copyFile(join(tesseract, "dist/worker.min.js.LICENSE.txt"), new URL("worker.LICENSE.txt", output));
for (const name of await readdir(core)) {
  if (name.endsWith(".wasm.js")) await copyFile(join(core, name), new URL(`core/${name}`, output));
}
await copyFile(join(core, "LICENSE"), new URL("core/LICENSE", output));
await copyFile(join(english, "4.0.0_best_int/eng.traineddata.gz"), new URL("lang/eng.traineddata.gz", output));
console.log("Prepared local OCR worker, WebAssembly cores, and English language data.");
