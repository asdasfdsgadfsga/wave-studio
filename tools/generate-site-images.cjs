// Requires FFmpeg on PATH. Keeps source images untouched.
// Run: node tools/generate-site-images.cjs
// Bump v1 here and in index.html/style.css when replacing cached artwork.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'images/site/v1');
fs.mkdirSync(outputDir, { recursive: true });

const variants = [
  ['studio_bg.jpg', 'studio-bg.webp', [], ['-quality', '82']],
  ['logo-new.png', 'logo-header.webp', ['-vf', 'scale=128:98:flags=lanczos'], ['-lossless', '1']],
  ['logo-new.png', 'logo-footer.webp', ['-vf', 'scale=384:294:flags=lanczos'], ['-lossless', '1']]
];
for (const [source, target, filters, options] of variants) {
  const output = path.join(outputDir, target);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(root, source),
    ...filters, '-c:v', 'libwebp', ...options, '-frames:v', '1', output], { stdio: 'inherit' });
  console.log(`${target}: ${fs.statSync(output).size} bytes`);
}
const favicon = path.join(outputDir, 'favicon.png');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(root, 'logo1.png'),
  '-vf', 'scale=64:64:flags=lanczos', '-frames:v', '1', favicon], { stdio: 'inherit' });
console.log(`favicon.png: ${fs.statSync(favicon).size} bytes`);
