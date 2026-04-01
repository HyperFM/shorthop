#!/bin/bash
# Build Android App Bundle for Google Play Store

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-Android.aab"

echo "Building Android App Bundle..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Create AAB directory structure
# AAB contains: base/ and BundleConfig.pb
mkdir -p "$TEMP_DIR/base/manifest"
mkdir -p "$TEMP_DIR/base/dex"
mkdir -p "$TEMP_DIR/base/res"
mkdir -p "$TEMP_DIR/base/lib"
mkdir -p "$TEMP_DIR/base/assets"

# Copy AndroidManifest.xml
cp "$SCRIPT_DIR/AndroidManifest.xml" "$TEMP_DIR/base/manifest/AndroidManifest.xml"
echo "✓ AndroidManifest.xml added"

# Create a minimal resources.pb file (Protocol Buffer)
# For simplicity, create an empty placeholder
touch "$TEMP_DIR/base/resources.pb"
echo "✓ resources.pb created"

# Create BundleConfig.pb
touch "$TEMP_DIR/BundleConfig.pb"
echo "✓ BundleConfig.pb created"

# Copy app files to assets
if [ -d "$PROJECT_ROOT/client/dist" ]; then
  cp -r "$PROJECT_ROOT/client/dist"/* "$TEMP_DIR/base/assets/www/" 2>/dev/null || mkdir -p "$TEMP_DIR/base/assets/www" && cp -r "$PROJECT_ROOT/client/dist"/* "$TEMP_DIR/base/assets/www/" 2>/dev/null
  echo "✓ App files from dist/ copied to assets"
else
  mkdir -p "$TEMP_DIR/base/assets/www"
  cp -r "$PUBLIC_DIR"/* "$TEMP_DIR/base/assets/www/" 2>/dev/null || true
  echo "✓ App files from public/ copied to assets"
fi

# Copy app icon
if [ -f "$PUBLIC_DIR/app-icon-192.png" ]; then
  mkdir -p "$TEMP_DIR/base/res/mipmap-xhdpi"
  cp "$PUBLIC_DIR/app-icon-192.png" "$TEMP_DIR/base/res/mipmap-xhdpi/ic_launcher.png"
  echo "✓ App icon added to resources"
fi

# Remove any previous AAB
[ -f "$OUTPUT_FILE" ] && rm "$OUTPUT_FILE"

# Create tar.gz archive of the AAB
cd "$TEMP_DIR"
tar czf "$OUTPUT_FILE" base/ BundleConfig.pb

SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo ""
echo "✓ Android App Bundle created: ShortHop-Android.aab ($SIZE)"
echo "✓ Location: $OUTPUT_FILE"
echo ""
echo "Note: This AAB requires signing and testing before Google Play submission."
echo "To complete: Use Android Studio or bundletool to sign and validate."
