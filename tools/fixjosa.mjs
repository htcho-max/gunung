import fs from 'fs';
for (const f of fs.readdirSync('src/js')) {
  const p = 'src/js/' + f; let s = fs.readFileSync(p, 'utf8'); const o = s;
  // ${X}${josa(X, '이', '가').slice(X.length)} → ${iga(X)}
  s = s.replace(/\$\{([^{}]+?)\}\$\{josa\(\1, '이', '가'\)\.slice\(\1\.length\)\}/g, (m, x) => '${iga(' + x + ')}');
  s = s.replace(/\$\{([^{}]+?)\}\$\{josa\(\1, '을', '를'\)\.slice\(\1\.length\)\}/g, (m, x) => '${eul(' + x + ')}');
  if (s !== o) { fs.writeFileSync(p, s); console.log('fixed', f); }
}
