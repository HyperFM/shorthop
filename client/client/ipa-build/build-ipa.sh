#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-iOS.ipa"

echo "Building iOS IPA package (ZIP format)..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

PAYLOAD_DIR="$TEMP_DIR/Payload"
APP_DIR="$PAYLOAD_DIR/ShortHop.app"
mkdir -p "$APP_DIR/_CodeSignature"
mkdir -p "$APP_DIR/www"

cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Info.plist"
echo "APPL????" > "$APP_DIR/PkgInfo"

cat > "$APP_DIR/_CodeSignature/CodeResources" << 'CODESIGN'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>files</key>
  <dict/>
  <key>files2</key>
  <dict/>
  <key>rules</key>
  <dict>
    <key>.*</key>
    <true/>
  </dict>
  <key>rules2</key>
  <dict>
    <key>.*</key>
    <dict>
      <key>weight</key>
      <real>1</real>
    </dict>
  </dict>
  <key>version</key>
  <integer>2</integer>
</dict>
</plist>
CODESIGN
echo "✓ App bundle structure created"

for f in "$PUBLIC_DIR"/*.png "$PUBLIC_DIR"/*.jpg "$PUBLIC_DIR"/*.jpeg "$PUBLIC_DIR"/*.ico "$PUBLIC_DIR"/favicon.png "$PUBLIC_DIR"/manifest.json "$PUBLIC_DIR"/sw.js; do
  [ -f "$f" ] && cp "$f" "$APP_DIR/www/" 2>/dev/null || true
done

for f in app-icon.png app-icon-192.png apple-touch-icon.png favicon.png manifest.json; do
  [ -f "$PUBLIC_DIR/$f" ] && cp "$PUBLIC_DIR/$f" "$APP_DIR/www/" 2>/dev/null || true
done
echo "✓ Essential web assets copied"

[ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"

cd "$TEMP_DIR"
zip -r -q "$OUTPUT_FILE" Payload/

SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "✓ iOS IPA created: ShortHop-iOS.ipa ($SIZE)"
echo "✓ Location: $OUTPUT_FILE"
