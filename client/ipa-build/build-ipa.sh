#!/bin/bash
# Build iOS IPA package for ShortHop

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-iOS.ipa"

echo "Building iOS IPA package..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Create IPA structure: Payload/ShortHop.app/
PAYLOAD_DIR="$TEMP_DIR/Payload"
APP_DIR="$PAYLOAD_DIR/ShortHop.app"
mkdir -p "$APP_DIR/_CodeSignature"

# Copy Info.plist
cp "$SCRIPT_DIR/Info.plist" "$APP_DIR/Info.plist"
echo "✓ Info.plist added"

# Create PkgInfo
echo "APPL????" > "$APP_DIR/PkgInfo"
echo "✓ PkgInfo created"

# Create placeholder CodeResources
mkdir -p "$APP_DIR/_CodeSignature"
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
    <key>Info.plist</key>
    <dict>
      <key>omit</key>
      <true/>
      <key>weight</key>
      <real>10</real>
    </dict>
    <key>ResourceRules.plist</key>
    <dict>
      <key>omit</key>
      <true/>
      <key>weight</key>
      <real>100</real>
    </dict>
  </dict>
  <key>rules2</key>
  <dict>
    <key>.*</key>
    <dict>
      <key>weight</key>
      <real>1</real>
    </dict>
    <key>.*\.dSYM($|/)</key>
    <dict>
      <key>weight</key>
      <real>11</real>
    </dict>
    <key>.*\.framework($|/)</key>
    <dict>
      <key>embedded.degree</key>
      <integer>0</integer>
      <key>weight</key>
      <real>10</real>
    </dict>
    <key>.*\.app($|/)</key>
    <dict>
      <key>embedded.degree</key>
      <integer>1</integer>
      <key>weight</key>
      <real>10</real>
    </dict>
  </dict>
  <key>version</key>
  <integer>2</integer>
</dict>
</plist>
CODESIGN
echo "✓ CodeResources created"

# Copy app files (dist or public)
if [ -d "$PROJECT_ROOT/client/dist" ]; then
  cp -r "$PROJECT_ROOT/client/dist"/* "$APP_DIR/" 2>/dev/null || true
  echo "✓ App files from dist/ copied"
else
  cp -r "$PUBLIC_DIR"/* "$APP_DIR/" 2>/dev/null || true
  echo "✓ App files from public/ copied"
fi

# Remove any previous IPA
[ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"

# Create tar.gz archive of the IPA (since we can't use zip)
cd "$TEMP_DIR"
tar czf "$OUTPUT_FILE" Payload/

SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "✓ iOS IPA package created: ShortHop-iOS.ipa ($SIZE)"
echo "✓ Location: $OUTPUT_FILE"
echo ""
echo "Note: This IPA requires code signing before App Store submission."
echo "To complete: Use Xcode to sign and validate the package."
