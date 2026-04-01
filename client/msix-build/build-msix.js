#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const buildDir = path.dirname(__filename);
const publicDir = path.join(buildDir, '..', 'public');
const distDir = path.join(buildDir, '..', 'dist');
const outputPath = path.join(buildDir, '..', 'public', 'ShortHop-Microsoft-Store.msix');

// Create Assets directory with required icon files
const assetsDir = path.join(buildDir, 'Assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Copy icon files to Assets folder
const iconSrc = path.join(publicDir, 'app-icon.png');
const icons = [
  { src: iconSrc, dst: 'StoreLogo.png' },
  { src: iconSrc, dst: 'Square150x150Logo.png' },
  { src: iconSrc, dst: 'Square44x44Logo.png' },
  { src: path.join(publicDir, 'app-icon.png'), dst: 'SplashScreen.png' }
];

icons.forEach(icon => {
  const dstPath = path.join(assetsDir, icon.dst);
  if (fs.existsSync(icon.src)) {
    fs.copyFileSync(icon.src, dstPath);
  }
});

console.log('Building Microsoft Store MSIX package...');

// Create ZIP archive (MSIX is just a ZIP with specific structure)
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`✓ MSIX package created: ${path.basename(outputPath)} (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  console.error('Archive error:', err);
  process.exit(1);
});

archive.pipe(output);

// Add AppxManifest.xml
archive.file(path.join(buildDir, 'AppxManifest.xml'), { name: 'AppxManifest.xml' });

// Add all assets
const assetFiles = fs.readdirSync(assetsDir);
assetFiles.forEach(file => {
  archive.file(path.join(assetsDir, file), { name: `Assets/${file}` });
});

// Add app content (from dist if available, otherwise public)
const srcDir = fs.existsSync(distDir) ? distDir : publicDir;
if (fs.existsSync(srcDir)) {
  archive.directory(srcDir, 'www');
}

archive.finalize();
