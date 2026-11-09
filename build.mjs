import fs from 'fs';
const files = fs.readdirSync('src/js').filter(f => f.endsWith('.js')).sort();
const js = files.map(f => `// ---- ${f}\n` + fs.readFileSync('src/js/' + f, 'utf8')).join('\n');
const html = fs.readFileSync('src/index.html', 'utf8').replace('<!--JS-->', () => `<script>\n${js}\n</script>`);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/artifact.html', html);
fs.writeFileSync('dist/index.html', `<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head><body>\n${html}\n</body></html>\n`);
fs.mkdirSync('docs', { recursive: true }); fs.copyFileSync('dist/index.html', 'docs/index.html'); // GitHub Pages(/docs)
console.log('built', (html.length / 1024).toFixed(0) + 'KB');
