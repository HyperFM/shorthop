#!/bin/bash
# Build Microsoft Store MSIX package for ShortHop

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
PUBLIC_DIR="$PROJECT_ROOT/client/public"
OUTPUT_FILE="$PUBLIC_DIR/ShortHop-Microsoft-Store.msix"

echo "Building Microsoft Store MSIX package..."

# Create temporary directory for MSIX contents
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy AppxManifest.xml
cp "$SCRIPT_DIR/AppxManifest.xml" "$TEMP_DIR/"

# Create Assets directory and copy icons
mkdir -p "$TEMP_DIR/Assets"
if [ -f "$PUBLIC_DIR/app-icon.png" ]; then
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/StoreLogo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/Square150x150Logo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/Square44x44Logo.png"
  cp "$PUBLIC_DIR/app-icon.png" "$TEMP_DIR/Assets/SplashScreen.png"
  echo "✓ Icons copied to Assets/"
fi

# Copy dist or public as www
if [ -d "$PROJECT_ROOT/client/dist" ]; then
  cp -r "$PROJECT_ROOT/client/dist" "$TEMP_DIR/www"
  echo "✓ Client dist copied to www/"
else
  mkdir -p "$TEMP_DIR/www"
  cp -r "$PUBLIC_DIR"/* "$TEMP_DIR/www/" 2>/dev/null || true
  echo "✓ Client public files copied to www/"
fi

# Create MSIX (which is a ZIP file)
cd "$TEMP_DIR"
zip -r -q "$OUTPUT_FILE" AppxManifest.xml Assets www/

echo "✓ MSIX package created: ShortHop-Microsoft-Store.msix ($(du -h "$OUTPUT_FILE" | cut -f1))"
echo "Location: $OUTPUT_FILE"
