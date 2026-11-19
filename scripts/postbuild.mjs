import fs from 'node:fs';
import path from 'node:path';

const distRoot = path.resolve('dist');
const subDir = path.join(distRoot, 'symmetry-Puzzle');

// Move Cloudflare Pages root config files (_redirects, _headers) from dist/symmetry-Puzzle/ to dist/
for (const fileName of ['_redirects', '_headers']) {
  const src = path.join(subDir, fileName);
  const dest = path.join(distRoot, fileName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    fs.unlinkSync(src);
  }
}

// Create root dist/index.html redirecting to /symmetry-Puzzle/
const rootIndexHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="refresh" content="0; url=/symmetry-Puzzle/" />
    <title>Symmetry Puzzle — Redirecting</title>
    <script>window.location.replace('/symmetry-Puzzle/' + window.location.search + window.location.hash);</script>
  </head>
  <body>
    <p>Redirecting to <a href="/symmetry-Puzzle/">/symmetry-Puzzle/</a>...</p>
  </body>
</html>
`;

fs.writeFileSync(path.join(distRoot, 'index.html'), rootIndexHtml, 'utf8');
console.log('[postbuild] Prepared dist/ root (_redirects, _headers, index.html) and dist/symmetry-Puzzle/.');
