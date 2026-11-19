import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve('dist');
const subDir = path.join(distRoot, 'symmetry-puzzle');

// Move Cloudflare root config files (_headers) from dist/symmetry-puzzle/ to dist/
for (const fileName of ['_headers']) {
  const src = path.join(subDir, fileName);
  const dest = path.join(distRoot, fileName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  }
}

// Create root dist/index.html redirecting to /symmetry-puzzle/
const rootIndexHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/symmetry-puzzle/" />
    <title>Symmetry Puzzle — Redirecting</title>
    <script>window.location.replace('/symmetry-puzzle/' + window.location.search + window.location.hash);</script>
  </head>
  <body>
    <p>Redirecting to <a href="/symmetry-puzzle/">/symmetry-puzzle/</a>...</p>
  </body>
</html>
`;

fs.writeFileSync(path.join(distRoot, 'index.html'), rootIndexHtml, 'utf8');
console.log('[postbuild] Prepared dist/ root (_headers, index.html) and dist/symmetry-puzzle/.');
