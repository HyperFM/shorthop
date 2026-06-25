#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-Microsoft-Store.tar.gz"

echo "Building Microsoft Store MSIX package..."

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy AppxManifest.xml
cp "$SCRIPT_DIR/AppxManifest.xml" "$TEMP_DIR/"

# Create Assets and copy icons
mkdir -p "$TEMP_DIR/Assets"
if [ -f "$PUBLIC_DIR/app-icon.png" ]; then
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/StoreLogo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/Square150x150Logo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/Square44x44Logo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/SplashScreen.png"
  echo "✓ Icons copied to Assets/"
fi

# Copy app files
mkdir -p "$TEMP_DIR/www"
if [ -d "$PROJECT_ROOT/client/dist" ]; then
  cp -r "$PROJECT_ROOT/client/dist"/* "$TEMP_DIR/www/" 2>/dev/null || true
else
  cp -r "$PUBLIC_DIR"/* "$TEMP_DIR/www/" 2>/dev/null || true
fi
echo "✓ App files packaged"

# Create tar.gz archive
cd "$TEMP_DIR"
tar czf "$OUTPUT_FILE" AppxManifest.xml Assets www/

SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "✓ MSIX package created: ShortHop-Microsoft-Store.tar.gz ($SIZE)"
echo "✓ Location: $OUTPUT_FILE"
