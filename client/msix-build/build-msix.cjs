const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const scriptDir = __dirname;
const publicDir = path.join(scriptDir, '..', 'public');
const outputFile = path.join(publicDir, 'ShortHop-Microsoft-Store.msix');

console.log('Building Microsoft Store MSIX package (ZIP format)...');

const tempDir = fs.mkdtempSync('/tmp/msix-');

const assetsDir = path.join(tempDir, 'Assets');
fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(path.join(tempDir, 'www'), { recursive: true });

fs.copyFileSync(
  path.join(scriptDir, 'AppxManifest.xml'),
  path.join(tempDir, 'AppxManifest.xml')
);
console.log('✓ AppxManifest.xml added');

const icon = path.join(publicDir, 'app-icon.png');
if (fs.existsSync(icon)) {
  for (const name of ['StoreLogo.png', 'Square150x150Logo.png', 'Square44x44Logo.png', 'SplashScreen.png']) {
    fs.copyFileSync(icon, path.join(assetsDir, name));
  }
}
console.log('✓ Icons copied');

const essentialFiles = [
  'app-icon.png', 'app-icon-192.png', 'favicon.png', 'manifest.json'
];
for (const f of essentialFiles) {
  const src = path.join(publicDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(tempDir, 'www', f));
  }
}
console.log('✓ Web assets copied');

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`\n✓ MSIX created: ShortHop-Microsoft-Store.msix (${sizeMB}MB)`);
  console.log(`✓ Location: ${outputFile}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

archive.pipe(output);
archive.file(path.join(tempDir, 'AppxManifest.xml'), { name: 'AppxManifest.xml' });
archive.directory(assetsDir, 'Assets');
archive.directory(path.join(tempDir, 'www'), 'www');
archive.finalize();
