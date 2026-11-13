// Requires FFmpeg on PATH. Run from any directory:
// node tools/generate-gallery-previews.cjs
// Bump the preview directory version and script.js path when replacing images.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const images = new Set([...script.matchAll(/image: "(images\/gallery\/[^\"]+\.jpg)"/g)].map(match => match[1]));
const outputDir = path.join(root, 'images/gallery/previews/v1');
fs.mkdirSync(outputDir, { recursive: true });

let originalBytes = 0;
let previewBytes = 0;
for (const image of images) {
  const input = path.join(root, image);
  const output = path.join(outputDir, path.basename(image, '.jpg') + '.webp');
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-vf', 'scale=768:768:force_original_aspect_ratio=increase,crop=768:768',
    '-c:v', 'libwebp', '-quality', '82', '-frames:v', '1', output
  ], { stdio: 'inherit' });
  originalBytes += fs.statSync(input).size;
  previewBytes += fs.statSync(output).size;
}
console.log({ images: images.size, originalBytes, previewBytes });
