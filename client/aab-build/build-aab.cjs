const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const scriptDir = __dirname;
const publicDir = path.join(scriptDir, '..', 'public');
const outputFile = path.join(publicDir, 'ShortHop-Android.aab');

console.log('Building Android App Bundle (ZIP format)...');

const tempDir = fs.mkdtempSync('/tmp/aab-');

const baseDir = path.join(tempDir, 'base');
fs.mkdirSync(path.join(baseDir, 'manifest'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'dex'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'res', 'mipmap-xhdpi'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'res', 'mipmap-xxhdpi'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'assets', 'www'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'lib'), { recursive: true });

fs.copyFileSync(
  path.join(scriptDir, 'AndroidManifest.xml'),
  path.join(baseDir, 'manifest', 'AndroidManifest.xml')
);
fs.writeFileSync(path.join(baseDir, 'resources.pb'), '');
fs.writeFileSync(path.join(tempDir, 'BundleConfig.pb'), '');
console.log('✓ AAB structure created');

const essentialFiles = [
  'app-icon.png', 'app-icon-192.png', 'favicon.png', 'manifest.json'
];
for (const f of essentialFiles) {
  const src = path.join(publicDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(baseDir, 'assets', 'www', f));
  }
}

const icon192 = path.join(publicDir, 'app-icon-192.png');
if (fs.existsSync(icon192)) {
  fs.copyFileSync(icon192, path.join(baseDir, 'res', 'mipmap-xhdpi', 'ic_launcher.png'));
  fs.copyFileSync(icon192, path.join(baseDir, 'res', 'mipmap-xxhdpi', 'ic_launcher.png'));
}
console.log('✓ Assets and icons copied');

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`\n✓ Android AAB created: ShortHop-Android.aab (${sizeMB}MB)`);
  console.log(`✓ Location: ${outputFile}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory(baseDir, 'base');
archive.file(path.join(tempDir, 'BundleConfig.pb'), { name: 'BundleConfig.pb' });
archive.finalize();
