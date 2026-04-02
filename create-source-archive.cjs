const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'client/public');
const outputFile = path.join(publicDir, 'shorthop-source.zip');

console.log('Building ShortHop source code archive...');

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

const filesToInclude = [
  'shared',
  'server',
  'client/src',
  'client/public/manifest.json',
  'client/public/robots.txt',
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.json',
  'drizzle.config.ts',
  'vite.config.ts',
  '.env.example',
  'README.md',
];

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`✓ Source archive created: shorthop-source.zip (${sizeMB}MB)`);
  console.log(`✓ Location: ${outputFile}`);
});

archive.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

archive.pipe(output);

for (const item of filesToInclude) {
  const fullPath = path.join(projectRoot, item);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⊘ Skipping ${item} (not found)`);
    continue;
  }
  
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    archive.directory(fullPath, item);
    console.log(`✓ Added ${item}/`);
  } else {
    archive.file(fullPath, { name: item });
    console.log(`✓ Added ${item}`);
  }
}

archive.finalize();
