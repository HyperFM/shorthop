#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-Android.aab"

echo "Building Android App Bundle (ZIP format)..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

mkdir -p "$TEMP_DIR/base/manifest"
mkdir -p "$TEMP_DIR/base/dex"
mkdir -p "$TEMP_DIR/base/res/mipmap-xhdpi"
mkdir -p "$TEMP_DIR/base/res/mipmap-xxhdpi"
mkdir -p "$TEMP_DIR/base/assets/www"
mkdir -p "$TEMP_DIR/base/lib"

cp "$SCRIPT_DIR/AndroidManifest.xml" "$TEMP_DIR/base/manifest/AndroidManifest.xml"
touch "$TEMP_DIR/base/resources.pb"
touch "$TEMP_DIR/BundleConfig.pb"
echo "✓ AAB structure created"

for f in app-icon.png app-icon-192.png favicon.png manifest.json; do
  [ -f "$PUBLIC_DIR/$f" ] && cp "$PUBLIC_DIR/$f" "$TEMP_DIR/base/assets/www/" 2>/dev/null || true
done

if [ -f "$PUBLIC_DIR/app-icon-192.png" ]; then
  cp "$PUBLIC_DIR/app-icon-192.png" "$TEMP_DIR/base/res/mipmap-xhdpi/ic_launcher.png"
  cp "$PUBLIC_DIR/app-icon-192.png" "$TEMP_DIR/base/res/mipmap-xxhdpi/ic_launcher.png"
fi

for f in "$PUBLIC_DIR"/*.png "$PUBLIC_DIR"/*.jpg; do
  [ -f "$f" ] && cp "$f" "$TEMP_DIR/base/assets/www/" 2>/dev/null || true
done
echo "✓ Assets and icons copied"

[ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"

cd "$TEMP_DIR"
zip -r -q "$OUTPUT_FILE" base/ BundleConfig.pb

SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "✓ Android AAB created: ShortHop-Android.aab ($SIZE)"
echo "✓ Location: $OUTPUT_FILE"
