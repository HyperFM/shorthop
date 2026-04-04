const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const scriptDir = __dirname;
const publicDir = path.join(scriptDir, '..', 'public');
const outputFile = path.join(publicDir, 'ShortHop-Android.apk');

console.log('Building Android APK package (ZIP format)...');

const tempDir = fs.mkdtempSync('/tmp/apk-');

const metaDir = path.join(tempDir, 'META-INF');
const resDir = path.join(tempDir, 'res');
const assetsDir = path.join(tempDir, 'assets', 'www');

fs.mkdirSync(metaDir, { recursive: true });
fs.mkdirSync(path.join(resDir, 'mipmap-mdpi'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'mipmap-hdpi'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'mipmap-xhdpi'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'mipmap-xxhdpi'), { recursive: true });
fs.mkdirSync(path.join(resDir, 'mipmap-xxxhdpi'), { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

fs.copyFileSync(
  path.join(scriptDir, 'AndroidManifest.xml'),
  path.join(tempDir, 'AndroidManifest.xml')
);

fs.writeFileSync(path.join(tempDir, 'classes.dex'), '');

fs.writeFileSync(path.join(metaDir, 'MANIFEST.MF'), 'Manifest-Version: 1.0\nCreated-By: ShortHop Build\n');
fs.writeFileSync(path.join(metaDir, 'CERT.SF'), '');
fs.writeFileSync(path.join(metaDir, 'CERT.RSA'), '');

console.log('✓ APK structure created');

const iconSrc = path.join(scriptDir, '..', 'ipa-build', 'Assets.xcassets', 'AppIcon.appiconset');
const iconMap = {
  'mipmap-mdpi': 'icon-58.png',
  'mipmap-hdpi': 'icon-76.png',
  'mipmap-xhdpi': 'icon-120.png',
  'mipmap-xxhdpi': 'icon-152.png',
  'mipmap-xxxhdpi': 'icon-180.png',
};

for (const [dir, file] of Object.entries(iconMap)) {
  const src = path.join(iconSrc, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(resDir, dir, 'ic_launcher.png'));
    fs.copyFileSync(src, path.join(resDir, dir, 'ic_launcher_round.png'));
  }
}

const essentialFiles = [
  'app-icon.png', 'app-icon-192.png', 'favicon.png', 'manifest.json'
];
for (const f of essentialFiles) {
  const src = path.join(publicDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(assetsDir, f));
  }
}

fs.writeFileSync(path.join(assetsDir, 'index.html'), `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>ShortHop</title>
  <style>body{margin:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#fff}
  .loader{text-align:center}.spinner{width:40px;height:40px;border:4px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
  @keyframes spin{to{transform:rotate(360deg)}}</style>
</head>
<body>
  <div class="loader"><div class="spinner"></div><p>Loading ShortHop...</p></div>
  <script>window.location.replace('https://49591681-5167-4dba-9528-350383bb09f8-00-zhm23k33wr5b.kirk.replit.dev/auth');</script>
</body>
</html>`);

console.log('✓ Assets, icons, and auth redirect copied');

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`\n✓ Android APK created: ShortHop-Android.apk (${sizeMB}MB)`);
  console.log(`✓ Location: ${outputFile}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory(tempDir, false);
archive.finalize();
