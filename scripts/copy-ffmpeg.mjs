// Copies the FFmpeg.wasm worker and core into public/ffmpeg so the browser loads them unbundled.
// The worker loads its core with a dynamic import that bundlers cannot follow, so it must not be bundled.
// Runs on every install (postinstall). The files are generated, so public/ffmpeg is git-ignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, "public", "ffmpeg");

const files = [
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js", "worker.js"],
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/const.js", "const.js"],
  ["node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js", "errors.js"],
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js", "ffmpeg-core.js"],
  ["node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm", "ffmpeg-core.wasm"],
];

mkdirSync(target, { recursive: true });
for (const [source, name] of files) {
  copyFileSync(join(root, source), join(target, name));
}
console.log(`[copy-ffmpeg] copied ${files.length} files to public/ffmpeg`);
