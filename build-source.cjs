const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const projectRoot = __dirname;
const publicDir = path.join(projectRoot, 'client/public');
const outputFile = path.join(publicDir, 'shorthop-source.zip');

console.log('Building ShortHop source code archive...');

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

const excludePaths = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.vercel',
  '.vscode',
  '.env',
  '.env.local',
  '.DS_Store',
  '*.log',
  'logs',
  'tmp',
  '.turbo',
  'coverage',
  '.nyc_output',
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

const entries = fs.readdirSync(projectRoot);
for (const entry of entries) {
  const fullPath = path.join(projectRoot, entry);
  const isDir = fs.statSync(fullPath).isDirectory();
  
  if (excludePaths.includes(entry)) continue;
  
  if (isDir) {
    archive.directory(fullPath, entry, (data) => {
      if (excludePaths.some(excl => data.name.includes(excl))) {
        return false;
      }
      return data;
    });
  } else {
    archive.file(fullPath, { name: entry });
  }
}

archive.finalize();
