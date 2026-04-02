const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const scriptDir = __dirname;
const publicDir = path.join(scriptDir, '..', 'public');
const outputFile = path.join(publicDir, 'ShortHop-iOS.ipa');

console.log('Building iOS IPA package (ZIP format)...');

const tempDir = fs.mkdtempSync('/tmp/ipa-');

const payloadDir = path.join(tempDir, 'Payload');
const appDir = path.join(payloadDir, 'ShortHop.app');
const sigDir = path.join(appDir, '_CodeSignature');
const wwwDir = path.join(appDir, 'www');
const assetsDir = path.join(appDir, 'Assets.xcassets', 'AppIcon.appiconset');

fs.mkdirSync(sigDir, { recursive: true });
fs.mkdirSync(wwwDir, { recursive: true });
fs.mkdirSync(assetsDir, { recursive: true });

fs.copyFileSync(path.join(scriptDir, 'Info.plist'), path.join(appDir, 'Info.plist'));
fs.writeFileSync(path.join(appDir, 'PkgInfo'), 'APPL????');

const codeResources = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>files</key><dict/><key>files2</key><dict/>
  <key>rules</key><dict><key>.*</key><true/></dict>
  <key>rules2</key><dict><key>.*</key><dict><key>weight</key><real>1</real></dict></dict>
  <key>version</key><integer>2</integer>
</dict>
</plist>`;
fs.writeFileSync(path.join(sigDir, 'CodeResources'), codeResources);
console.log('✓ App bundle structure created');

const essentialFiles = [
  'app-icon.png', 'app-icon-192.png', 'apple-touch-icon.png',
  'favicon.png', 'manifest.json'
];
for (const f of essentialFiles) {
  const src = path.join(publicDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(wwwDir, f));
  }
}
console.log('✓ Essential web assets copied');

const appiconsetSrc = path.join(scriptDir, 'Assets.xcassets', 'AppIcon.appiconset');
if (fs.existsSync(appiconsetSrc)) {
  const files = fs.readdirSync(appiconsetSrc);
  for (const f of files) {
    fs.copyFileSync(path.join(appiconsetSrc, f), path.join(assetsDir, f));
  }
  console.log(`✓ AppIcon.appiconset added (${files.length} files including Contents.json)`);
}

const iconFile = path.join(publicDir, 'app-icon.png');
if (fs.existsSync(iconFile)) {
  fs.copyFileSync(iconFile, path.join(appDir, 'AppIcon60x60@2x.png'));
  fs.copyFileSync(iconFile, path.join(appDir, 'AppIcon60x60@3x.png'));
  fs.copyFileSync(iconFile, path.join(appDir, 'AppIcon76x76@2x.png'));
  fs.copyFileSync(iconFile, path.join(appDir, 'AppIcon83.5x83.5@2x.png'));
  console.log('✓ Root-level app icons added');
}

if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);

const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(1);
  console.log(`\n✓ iOS IPA created: ShortHop-iOS.ipa (${sizeMB}MB)`);
  console.log(`✓ Location: ${outputFile}`);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

archive.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

archive.pipe(output);
archive.directory(payloadDir, 'Payload');
archive.finalize();
